const Elements = Object.fromEntries(Array.from(document.querySelectorAll('[id]')).map(Element => [Element.id, Element]))
let State = null
let SelectedId = null
let CurrentTab = 'characters'
let Equipment = null
let EquipmentOwnerId = null
let EquipmentBusy = false
let DeletionTarget = null
let DeleteBusy = false
let NextRequestId = 0
const Pending = new Map()

function Message(Text, IsError = false) {
  Elements.message.textContent = Text
  Elements.message.classList.toggle('error', IsError)
}

function Send(Action, Payload = {}) {
  if (!window.magelight) {
    Message('Для работы нужен запущенный Skyrim с Magelight UI', true)
    return Promise.reject(new Error('Нет подключения к игре'))
  }
  if (Payload.id !== undefined && Payload.identity === undefined) {
    Payload = { ...Payload, identity: State?.slots.find(Slot => Slot.id === Payload.id)?.identity }
  }
  const RequestId = ++NextRequestId
  return new Promise((Resolve, Reject) => {
    const Timeout = setTimeout(() => {
      Pending.delete(RequestId)
      Reject(new Error('Игра не ответила. Обновите список перед повторным действием'))
    }, 15000)
    Pending.set(RequestId, { Resolve, Reject, Timeout })
    window.magelight.send('studioCommand', { action: Action, requestId: RequestId, ...Payload })
  })
}

window.studioResponse = Payload => {
  try {
    const Response = typeof Payload === 'string' ? JSON.parse(Payload) : Payload
    const Request = Pending.get(Response.requestId)
    if (Request) {
      clearTimeout(Request.Timeout)
      Pending.delete(Response.requestId)
    }
    if (Response.ok) {
      State = Response.state
      if (State.equipment) {
        Equipment = State.equipment
        EquipmentOwnerId = State.equipmentOwnerId
      }
      Render()
      Request?.Resolve(State)
    } else {
      const ErrorValue = new Error(Response.error || 'Не удалось выполнить действие')
      Request?.Reject(ErrorValue)
      Message(ErrorValue.message, true)
    }
  } catch (ErrorValue) { Message('Ошибка ответа: ' + ErrorValue.message, true) }
}

function Render() {
  if (!State) return
  Elements.connection.textContent = State.ready ? 'Игра подключена' : 'Пул недоступен'
  Elements.notice.textContent = State.error || (!State.worldLoaded ? 'Загрузите сохранение или начните новую игру.' : '')
  Elements.createButton.disabled = !State.ready || !State.worldLoaded
  for (const Sex of ['female', 'male']) {
    Elements[Sex + 'Count'].textContent = State[Sex + 'Used'] + ' / 80'
    Elements[Sex + 'Progress'].value = State[Sex + 'Used']
  }
  Elements.list.replaceChildren()
  const Query = Elements.search.value.trim().toLocaleLowerCase()
  const Visible = State.slots.filter(Slot => Slot.name.toLocaleLowerCase().includes(Query))
  Elements.empty.hidden = Visible.length > 0
  for (const Slot of Visible) {
    const Button = document.createElement('button')
    Button.className = 'npc' + (Slot.id === SelectedId ? ' selected' : '')
    const Name = document.createElement('strong')
    Name.textContent = Slot.name
    const Details = document.createElement('span')
    Details.textContent = [Slot.female ? 'Женский' : 'Мужской', Slot.dead ? 'Погиб' : Slot.parked ? 'Убран' : 'В мире'].join(' · ')
    Button.append(Name, Details)
    Button.onclick = () => { SelectedId = Slot.id; Render(); if (CurrentTab === 'equipment') LoadEquipment() }
    Elements.list.append(Button)
  }
  const Selected = State.slots.find(Slot => Slot.id === SelectedId)
  Elements.characterPanel.hidden = CurrentTab !== 'characters'
  Elements.equipmentPanel.hidden = CurrentTab !== 'equipment'
  RenderEquipment()
  Elements.deleteNpc.hidden = !Selected
  Elements.deleteNpc.disabled = DeleteBusy || EquipmentBusy || !State.ready || !State.worldLoaded
  if (!Selected || DeletionTarget?.identity !== Selected.identity) DeletionTarget = null
  Elements.deleteConfirmation.hidden = !DeletionTarget
  Elements.deleteQuestion.textContent = DeletionTarget ? 'Удалить «' + DeletionTarget.name + '»?' : ''
  Elements.confirmDelete.disabled = DeleteBusy || EquipmentBusy
  Elements.cancelDelete.disabled = DeleteBusy
  Elements.properties.hidden = !Selected
  Elements.selectedName.textContent = Selected?.name || 'Новый персонаж'
  Elements.slotBadge.textContent = Selected ? 'СЛОТ ' + (Selected.id % 80 + 1) + (Selected.female ? ' · Ж' : ' · М') : 'СВОБОДНЫЙ СЛОТ'
  if (Selected) {
    if (document.activeElement !== Elements.editName) Elements.editName.value = Selected.name
    Elements.race.textContent = Selected.race
    Elements.reference.textContent = Selected.reference
    Elements.status.textContent = Selected.dead ? 'Погиб' : Selected.parked ? 'Убран из мира' : 'В мире'
    Elements.teleport.disabled = Selected.parked
    Elements.summon.disabled = Selected.dead
  }
}

async function Action(Name, Payload = {}) {
  try {
    await Send(Name, Payload)
    Message('Изменения применены. Сохраните игру, чтобы сохранить состояние NPC.')
  } catch (ErrorValue) { Message(ErrorValue.message, true) }
}
Elements.close.onclick = () => { window.magelight?.send('studioCommand', { action: 'close' }) }
Elements.refresh.onclick = () => Action('state')
Elements.search.oninput = Render
Elements.createForm.onsubmit = async Event => {
  Event.preventDefault()
  const Name = Elements.newName.value.trim()
  if (!Name) return
  Elements.createButton.disabled = true
  try {
    const Previous = new Set(State?.slots.map(Slot => Slot.id))
    await Send('create', { name: Name, female: Elements.sex.value === 'female' })
    SelectedId = State.slots.find(Slot => !Previous.has(Slot.id))?.id ?? SelectedId
    Elements.newName.value = ''
    Render()
    Message('NPC создан. Для постоянного сохранения сохраните игру.')
    if (CurrentTab === 'equipment') LoadEquipment()
  } catch (ErrorValue) { Message(ErrorValue.message, true); Render() }
}
for (const Name of ['summon', 'park', 'teleport']) Elements[Name].onclick = () => Action(Name, { id: SelectedId })
Elements.rename.onclick = () => Action('rename', { id: SelectedId, name: Elements.editName.value.trim() })
window.magelight?.on('__uimode', Value => { if (String(Value) === '1') Action('state') })
Send('state').catch(ErrorValue => Message(ErrorValue.message, true))

function EquipmentPayload() {
  return { id: SelectedId, query: Elements.equipmentQuery.value.trim(), kind: Elements.equipmentKind.value }
}

async function LoadEquipment(ActionName = 'equipment', Payload = {}) {
  if (SelectedId === null || EquipmentBusy) return
  const RequestedId = SelectedId
  EquipmentBusy = true
  RenderEquipment()
  try {
    await Send(ActionName, { ...EquipmentPayload(), ...Payload })
    if (ActionName !== 'equipment') Message(ActionName === 'saveEquipmentPreset' ? 'Набор сохранён в файле и доступен другим NPC.' : 'Снаряжение обновлено. Сохраните игру и проверьте внешний вид NPC.')
  } catch (ErrorValue) { Message(ErrorValue.message, true) }
  finally {
    EquipmentBusy = false
    Render()
    if (CurrentTab === 'equipment' && RequestedId !== SelectedId && SelectedId !== null) LoadEquipment()
  }
}

function RenderEquipment() {
  const Selected = State?.slots.find(Slot => Slot.id === SelectedId)
  Elements.equipmentEmpty.hidden = !!Selected
  const Ready = Selected && Equipment && EquipmentOwnerId === SelectedId
  Elements.equipmentContent.hidden = !Ready
  Elements.charactersTab.classList.toggle('active', CurrentTab === 'characters')
  Elements.equipmentTab.classList.toggle('active', CurrentTab === 'equipment')
  if (!Ready) return
  const CanChange = !EquipmentBusy && !DeleteBusy && !Selected.parked && !Selected.dead && State.ready && State.worldLoaded
  const PreviousPreset = Elements.equipmentPreset.value
  Elements.equipmentPreset.replaceChildren()
  for (const Preset of Equipment.presets) {
    const Option = document.createElement('option')
    Option.value = Preset.id
    Option.textContent = Preset.name + (Preset.available ? '' : ' (нет зависимости)')
    Elements.equipmentPreset.append(Option)
  }
  if (Equipment.presets.some(Preset => Preset.id === PreviousPreset)) Elements.equipmentPreset.value = PreviousPreset
  const Preset = Equipment.presets.find(Preset => Preset.id === Elements.equipmentPreset.value)
  Elements.presetDescription.textContent = Preset ? Preset.error || 'Предметов в наборе: ' + Preset.items.length : 'Наборов пока нет'
  Elements.applyPreset.disabled = !CanChange || !Preset?.available
  Elements.savePreset.disabled = !CanChange
  Elements.equipmentRefresh.disabled = EquipmentBusy
  Elements.equipmentMatches.textContent = 'Найдено: ' + Equipment.matches + '. Показаны первые 100; уточните поиск.'
  function ItemRow(Item, IsInventory) {
    const Row = document.createElement('div')
    Row.className = 'equipment-item'
    const Info = document.createElement('span')
    const Title = document.createElement('strong')
    Title.textContent = Item.name + (IsInventory ? ' × ' + Item.count + (Item.worn ? ' · надето' : '') : '')
    const Origin = document.createElement('small')
    Origin.textContent = Item.plugin + ' | ' + Item.form.toString(16).toUpperCase().padStart(6, '0')
    Info.append(Title, Origin)
    const Button = document.createElement('button')
    Button.textContent = IsInventory && Item.worn ? 'Снять' : IsInventory ? 'Надеть' : 'Выдать и надеть'
    Button.disabled = !CanChange
    Button.onclick = () => LoadEquipment(IsInventory && Item.worn ? 'unequipItem' : 'giveItem', { item: { plugin: Item.plugin, form: Item.form }, count: Item.kind === 'ammo' ? 100 : 1 })
    Row.append(Info, Button)
    return Row
  }
  Elements.equipmentInventory.replaceChildren(...Equipment.inventory.map(Item => ItemRow(Item, true)))
  Elements.equipmentCatalog.replaceChildren(...Equipment.catalog.map(Item => ItemRow(Item, false)))
}
Elements.charactersTab.onclick = () => { CurrentTab = 'characters'; Render() }
Elements.equipmentTab.onclick = () => { CurrentTab = 'equipment'; Render(); LoadEquipment() }
Elements.equipmentRefresh.onclick = () => LoadEquipment()
Elements.equipmentPreset.onchange = RenderEquipment
Elements.equipmentSearchForm.onsubmit = Event => { Event.preventDefault(); LoadEquipment() }
Elements.applyPreset.onclick = () => LoadEquipment('applyEquipmentPreset', { preset: Elements.equipmentPreset.value })
Elements.savePreset.onclick = () => {
  const Name = Elements.presetName.value.trim()
  if (!Name) { Message('Введите имя набора', true); return }
  LoadEquipment('saveEquipmentPreset', { name: Name })
}

Elements.deleteNpc.onclick = () => {
  const Selected = State?.slots.find(Slot => Slot.id === SelectedId)
  if (!Selected || EquipmentBusy || DeleteBusy) return
  DeletionTarget = { id: Selected.id, identity: Selected.identity, name: Selected.name }
  Render()
}
Elements.cancelDelete.onclick = () => { DeletionTarget = null; Render() }
Elements.confirmDelete.onclick = async () => {
  if (!DeletionTarget || EquipmentBusy || DeleteBusy) return
  const Target = DeletionTarget
  DeleteBusy = true
  Render()
  try {
    await Send('delete', { id: Target.id, identity: Target.identity, confirmed: true })
    Equipment = null
    EquipmentOwnerId = null
    if (SelectedId === Target.id) SelectedId = null
    DeletionTarget = null
    Message('Персонаж удалён, слот очищен. Сохраните игру, чтобы сохранить удаление.')
  } catch (ErrorValue) { Message(ErrorValue.message, true) }
  finally { DeleteBusy = false; Render() }
}
