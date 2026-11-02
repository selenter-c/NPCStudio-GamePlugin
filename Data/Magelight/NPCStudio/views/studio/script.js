const Elements = Object.fromEntries([...document.querySelectorAll('[id]')].map((Element) => [Element.id, Element]))
let State = null
let SelectedId = null
let CurrentTab = 'create'
let Equipment = null
let EquipmentOwnerId = null
let EquipmentBusy = false
let MutationBusy = false
let DeletionTarget = null
let SettingsDirty = false
let NextRequestId = 0
const Pending = new Map()
const Pages = {
  create: ['СОЗДАНИЕ', 'Новый персонаж'],
  roster: ['ПОСТОЯННЫЙ РЕЗЕРВ', 'Мои персонажи'],
  equipment: ['ПРЕДМЕТЫ И ЭКИПИРОВКА', 'Снаряжение'],
  presets: ['ГОТОВЫЕ И СВОИ КОМПЛЕКТЫ', 'Библиотека наборов'],
  settings: ['ПАРАМЕТРЫ СТУДИИ', 'Настройки'],
}
const Icon = (Name) => {
  const Svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  Svg.classList.add('icon')
  const Use = document.createElementNS(Svg.namespaceURI, 'use')
  Use.setAttribute('href', '#i-' + Name)
  Svg.append(Use)
  return Svg
}
function Message(Text, IsError = false) {
  Elements.message.textContent = Text
  Elements.message.classList.toggle('error', IsError)
}
function CurrentActor() {
  return State?.slots.find((Slot) => Slot.id === SelectedId)
}
function CanChange() {
  const Actor = CurrentActor()
  return (
    State?.ready &&
    State.worldLoaded &&
    Actor &&
    !Actor.parked &&
    !Actor.dead &&
    !Actor.restoring &&
    !EquipmentBusy &&
    !MutationBusy
  )
}
function Send(Action, Payload = {}) {
  if (!window.magelight) return Promise.reject(new Error('Нет подключения к игре'))
  if (Payload.id !== undefined && Payload.identity === undefined)
    Payload = { ...Payload, identity: State?.slots.find((Slot) => Slot.id === Payload.id)?.identity }
  const RequestId = ++NextRequestId
  return new Promise((Resolve, Reject) => {
    const Timeout = setTimeout(() => {
      Pending.delete(RequestId)
      Reject(new Error('Игра не ответила. Обновите данные перед повторным действием'))
    }, 15000)
    Pending.set(RequestId, { Resolve, Reject, Timeout })
    window.magelight.send('studioCommand', { action: Action, requestId: RequestId, ...Payload })
  })
}
window.studioResponse = (Payload) => {
  try {
    const Response = typeof Payload === 'string' ? JSON.parse(Payload) : Payload
    const Request = Pending.get(Response.requestId)
    if (Request) {
      clearTimeout(Request.Timeout)
      Pending.delete(Response.requestId)
    }
    if (!Response.ok) {
      const Failure = new Error(Response.error || 'Ошибка команды')
      Request?.Reject(Failure)
      Message(Failure.message, true)
      return
    }
    State = Response.state
    if (State.equipment) {
      Equipment = State.equipment
      EquipmentOwnerId = State.equipmentOwnerId
    }
    Render()
    Request?.Resolve(State)
  } catch (Failure) {
    Message(Failure.message, true)
  }
}
function Options(Select, Rows, Preferred) {
  const Previous = Preferred ?? Select.value
  const Hash = JSON.stringify(Rows)
  if (Select.dataset.options !== Hash) {
    Select.replaceChildren(
      ...Rows.map((Row) => {
        const Option = document.createElement('option')
        Option.value = String(Row.value)
        Option.textContent = Row.label
        Option.disabled = !!Row.disabled
        return Option
      }),
    )
    Select.dataset.options = Hash
  }
  if ([...Select.options].some((Option) => Option.value === String(Previous))) Select.value = String(Previous)
  RefreshCombo(Select)
}
function Chord(Settings) {
  const Key = KeyOptions.find((Option) => Option.value === Settings?.key)?.label || 'Клавиша ' + Settings?.key
  return [Settings?.modifiers & 1 && 'Shift', Settings?.modifiers & 2 && 'Ctrl', Settings?.modifiers & 4 && 'Alt', Key]
    .filter(Boolean)
    .join(' + ')
}
const KeyOptions = [
  ...Array.from({ length: 10 }, (_, Index) => ({ value: 0x3b + Index, label: 'F' + (Index + 1) })),
  { value: 0x57, label: 'F11' },
  { value: 0x58, label: 'F12' },
  ...Object.entries({
    Q: 16,
    W: 17,
    E: 18,
    R: 19,
    T: 20,
    Y: 21,
    U: 22,
    I: 23,
    O: 24,
    P: 25,
    A: 30,
    S: 31,
    D: 32,
    F: 33,
    G: 34,
    H: 35,
    J: 36,
    K: 37,
    L: 38,
    Z: 44,
    X: 45,
    C: 46,
    V: 47,
    B: 48,
    N: 49,
    M: 50,
    Home: 199,
    End: 207,
    Insert: 210,
    Delete: 211,
  }).map(([label, value]) => ({ label, value })),
]
function Render() {
  if (!State) return
  Elements.connection.textContent = State.ready ? 'Игра подключена' : 'Пул недоступен'
  Elements.notice.textContent =
    State.error || (!State.worldLoaded ? 'Загрузите сохранение или начните новую игру.' : '')
  Elements.notice.hidden = !Elements.notice.textContent
  Elements.rosterCount.textContent = State.slots.length
  for (const Sex of ['female', 'male']) {
    Elements[Sex + 'Count'].textContent = State[Sex + 'Used'] + ' / ' + State.capacity
    Elements[Sex + 'Progress'].value = State[Sex + 'Used']
    Elements[Sex + 'Progress'].max = State.capacity
  }
  Elements.hotkeyHint.textContent = Chord(State.settings)
  for (const Name of Object.keys(Pages)) Elements[Name + 'Page'].hidden = CurrentTab !== Name
  document
    .querySelectorAll('[data-tab]')
    .forEach((Button) => Button.classList.toggle('active', Button.dataset.tab === CurrentTab))
  Elements.pageEyebrow.textContent = Pages[CurrentTab][0]
  Elements.pageTitle.textContent = Pages[CurrentTab][1]
  if (SelectedId !== null && !CurrentActor()) {
    SelectedId = null
    Equipment = null
    DeletionTarget = null
  }
  Options(
    Elements.actorPicker,
    [
      { value: '', label: 'Выберите персонажа…' },
      ...State.slots.map((Slot) => ({
        value: Slot.id,
        label: Slot.name + ' · ' + (Slot.female ? 'Ж' : 'М') + Slot.number,
      })),
    ],
    SelectedId ?? '',
  )
  Elements.actorPicker.closest('.combo').hidden = CurrentTab === 'create' || CurrentTab === 'settings'
  RenderCreation()
  RenderRoster()
  RenderLibrary()
  RenderEquipment()
  if (!SettingsDirty) {
    Options(Elements.hotkeyKey, KeyOptions, State.settings.key)
    Elements.modifierShift.checked = !!(State.settings.modifiers & 1)
    Elements.modifierCtrl.checked = !!(State.settings.modifiers & 2)
    Elements.modifierAlt.checked = !!(State.settings.modifiers & 4)
  }
  Elements.hotkeyPreview.textContent = Chord(ReadSettings())
}
function RenderCreation() {
  const Female = Elements.sex.value === 'female'
  const Slots = State.availableSlots.filter((Slot) => Slot.female === Female)
  const Status = { fresh: 'новый', used: 'использовался', unknown: 'история до 0.4 неизвестна' }
  Options(Elements.slotSelect, [
    { value: '', label: 'Автоматически · сначала новые' },
    ...Slots.map((Slot) => ({ value: Slot.id, label: 'Слот ' + Slot.number + ' · ' + Status[Slot.history] })),
  ])
  const Slot = Slots.find((Slot) => String(Slot.id) === Elements.slotSelect.value)
  Elements.slotInfo.textContent = Slot
    ? 'Слот ' + Slot.number + ': ' + Status[Slot.history] + '.'
    : 'Свободно: ' + Slots.length + '. Новые слоты имеют приоритет; занятые недоступны.'
  const Library = State.library
  Options(Elements.creationCategory, [
    { value: '', label: 'Все категории' },
    ...Library.categories.map((Name) => ({ value: Name, label: Name })),
  ])
  const Presets = Library.presets.filter(
    (Preset) => !Elements.creationCategory.value || Preset.category === Elements.creationCategory.value,
  )
  Options(Elements.creationPreset, [
    { value: '', label: 'Без комплекта' },
    ...Presets.map((Preset) => ({ value: Preset.id, label: Preset.name, disabled: !Preset.available })),
  ])
  const Preset = Library.presets.find((Item) => Item.id === Elements.creationPreset.value)
  Elements.creationPresetInfo.textContent = Preset
    ? Preset.error ||
      Preset.category + ' · ' + Preset.items.length + ' предметов. Снаряжение не меняет фракцию или поведение.'
    : 'Персонаж появится без дополнительного снаряжения.'
  Elements.createButton.disabled = MutationBusy || !State.ready || !State.worldLoaded || !Slots.length
  Elements.randomName.disabled = MutationBusy || !State.ready || !State.worldLoaded
}
function RenderRoster() {
  const Query = Elements.search.value.trim().toLocaleLowerCase()
  const Visible = State.slots.filter((Slot) => Slot.name.toLocaleLowerCase().includes(Query))
  Elements.list.replaceChildren(
    ...Visible.map((Slot) => {
      const Button = document.createElement('button')
      Button.className = 'npc' + (Slot.id === SelectedId ? ' selected' : '')
      const Avatar = document.createElement('span')
      Avatar.className = 'avatar'
      Avatar.textContent = Slot.name.slice(0, 1)
      const Info = document.createElement('span')
      const Name = document.createElement('strong')
      Name.textContent = Slot.name
      const Detail = document.createElement('small')
      Detail.textContent = [
        Slot.female ? 'Женский' : 'Мужской',
        Slot.dead ? 'Погиб' : Slot.parked ? 'Скрыт' : 'В мире',
      ].join(' · ')
      const Number = document.createElement('span')
      Number.className = 'slot-number'
      Number.textContent = 'Слот ' + Slot.number
      Info.append(Name, Detail)
      Button.append(Avatar, Info, Number)
      Button.onclick = () => SelectActor(Slot.id)
      return Button
    }),
  )
  Elements.empty.hidden = !!Visible.length
  const Actor = CurrentActor()
  Elements.properties.hidden = !Actor
  Elements.selectedName.textContent = Actor?.name || 'Выберите персонажа'
  Elements.slotBadge.textContent = Actor ? (Actor.female ? 'Ж' : 'М') + ' · ' + Actor.number : ''
  if (!Actor) return
  if (document.activeElement !== Elements.editName) Elements.editName.value = Actor.name
  Elements.race.textContent = Actor.race
  Elements.reference.textContent = Actor.reference
  Elements.status.textContent = Actor.dead ? 'Погиб' : Actor.parked ? 'Убран из мира' : 'В мире'
  Elements.actorWarning.textContent = Actor.warning || ''
  Elements.teleport.disabled = MutationBusy || Actor.parked
  Elements.summon.disabled = MutationBusy || Actor.dead
  Elements.park.disabled = MutationBusy || Actor.parked || Actor.restoring
  Elements.rename.disabled = MutationBusy
  Elements.deleteNpc.disabled = MutationBusy || EquipmentBusy
  if (DeletionTarget?.identity !== Actor.identity) DeletionTarget = null
  Elements.deleteConfirmation.hidden = !DeletionTarget
  Elements.deleteQuestion.textContent = DeletionTarget ? 'Удалить «' + DeletionTarget.name + '»?' : ''
  Elements.confirmDelete.disabled = MutationBusy || EquipmentBusy
  Elements.cancelDelete.disabled = MutationBusy
}
function RenderLibrary() {
  const Library = State.library
  Options(Elements.presetCategory, [
    { value: '', label: 'Все категории' },
    ...Library.categories.map((Name) => ({ value: Name, label: Name })),
  ])
  Options(
    Elements.saveCategory,
    Library.categories.map((Name) => ({ value: Name, label: Name })),
  )
  const Presets = Library.presets.filter(
    (Preset) => !Elements.presetCategory.value || Preset.category === Elements.presetCategory.value,
  )
  Options(
    Elements.equipmentPreset,
    Presets.map((Preset) => ({ value: Preset.id, label: Preset.name })),
  )
  const Selected = Presets.find((Preset) => Preset.id === Elements.equipmentPreset.value)
  Elements.presetDescription.textContent = Selected
    ? Selected.error ||
      Selected.category + ' · ' + Selected.items.length + ' предметов. Повторное применение не накапливает копии.'
    : 'В этой категории пока нет наборов.'
  Elements.applyPreset.disabled = !CanChange() || !Selected?.available
  Elements.savePreset.disabled = !CanChange()
  Elements.presetCards.replaceChildren(
    ...Presets.map((Preset) => {
      const Button = document.createElement('button')
      Button.className = 'preset-card' + (Preset.id === Selected?.id ? ' selected' : '')
      const Info = document.createElement('span')
      const Name = document.createElement('strong')
      Name.textContent = Preset.name
      const Detail = document.createElement('small')
      Detail.textContent = Preset.available ? Preset.items.length + ' предметов · ' + Preset.category : Preset.error
      Info.append(Name, Detail)
      Button.append(Icon('shield'), Info)
      Button.onclick = () => {
        Elements.equipmentPreset.value = Preset.id
        Render()
      }
      return Button
    }),
  )
}
function RenderEquipment() {
  const Actor = CurrentActor()
  Elements.equipmentEmpty.hidden = !!Actor
  Elements.equipmentContent.hidden = !Actor
  Elements.equipmentAudit.textContent =
    (Actor?.warning || 'Вещи хранятся в обычном сохранении Skyrim.') +
    (Actor?.audit?.missing?.length
      ? ' · ' +
        Actor.audit.missing
          .slice(0, 8)
          .map((Item) => Item.name + ': ' + Item.actual + ' / ' + Item.expected)
          .join('; ')
      : '')
  Elements.equipmentRefresh.disabled = EquipmentBusy
  if (!Actor || !Equipment || EquipmentOwnerId !== SelectedId) {
    Elements.equipmentInventory.replaceChildren()
    Elements.equipmentCatalog.replaceChildren()
    return
  }
  const Allowed = CanChange()
  function Row(Item, Inventory) {
    const Container = document.createElement('div')
    Container.className = 'equipment-item'
    const Info = document.createElement('span')
    const Title = document.createElement('strong')
    Title.textContent = Item.name + (Inventory ? ' × ' + Item.count + (Item.worn ? ' · надето' : '') : '')
    const Source = document.createElement('small')
    Source.textContent = Item.plugin + ' | ' + Item.form.toString(16).toUpperCase().padStart(6, '0')
    const Button = document.createElement('button')
    Button.textContent = Inventory && Item.worn ? 'Снять' : Inventory ? 'Надеть' : 'Выдать'
    Button.disabled = !Allowed
    Button.onclick = () =>
      LoadEquipment(Inventory && Item.worn ? 'unequipItem' : 'giveItem', {
        item: { plugin: Item.plugin, form: Item.form },
        count: Item.kind === 'ammo' ? 100 : 1,
      })
    Info.append(Title, Source)
    Container.append(Info, Button)
    return Container
  }
  Elements.equipmentInventory.replaceChildren(...Equipment.inventory.map((Item) => Row(Item, true)))
  Elements.equipmentCatalog.replaceChildren(...Equipment.catalog.map((Item) => Row(Item, false)))
  Elements.equipmentMatches.textContent = 'Найдено: ' + Equipment.matches + ' · показаны первые 100'
}
function SelectActor(Id) {
  SelectedId = Id === '' ? null : Number(Id)
  DeletionTarget = null
  Equipment = null
  Render()
  if (CurrentTab === 'equipment' && SelectedId !== null) LoadEquipment()
}
function Tab(Name) {
  CurrentTab = Name
  CloseCombo()
  Render()
  if (Name === 'equipment' && SelectedId !== null) LoadEquipment()
}
async function Act(Action, Payload = {}) {
  if (MutationBusy) return
  MutationBusy = true
  Render()
  try {
    await Send(Action, Payload)
    Message('Изменения применены. Сохраните игру.')
  } catch (Failure) {
    Message(Failure.message, true)
  } finally {
    MutationBusy = false
    Render()
  }
}
async function LoadEquipment(Action = 'equipment', Payload = {}) {
  if (SelectedId === null || EquipmentBusy || MutationBusy) return
  const RequestedId = SelectedId
  EquipmentBusy = true
  Render()
  try {
    await Send(Action, {
      id: SelectedId,
      query: Elements.equipmentQuery.value.trim(),
      kind: Elements.equipmentKind.value,
      ...Payload,
    })
    if (Action !== 'equipment')
      Message(
        Action === 'saveEquipmentPreset' ? 'Набор сохранён в библиотеке.' : 'Снаряжение обновлено. Сохраните игру.',
      )
  } catch (Failure) {
    Message(Failure.message, true)
  } finally {
    EquipmentBusy = false
    Render()
    if (CurrentTab === 'equipment' && SelectedId !== RequestedId && SelectedId !== null) LoadEquipment()
  }
}
function ReadSettings() {
  return {
    key: Number(Elements.hotkeyKey.value || 0x42),
    modifiers:
      (Elements.modifierShift.checked ? 1 : 0) |
      (Elements.modifierCtrl.checked ? 2 : 0) |
      (Elements.modifierAlt.checked ? 4 : 0),
  }
}
// Свой список вместо нативного popup: одинаковый вид в Magelight и браузере.
let Popup = null
function RefreshCombo(Select) {
  const Button = Select.parentElement.querySelector('.combo-button')
  if (!Button) return
  Button.querySelector('.combo-label').textContent = Select.selectedOptions[0]?.textContent || 'Нет вариантов'
  Button.disabled = Select.disabled
}
function CloseCombo() {
  if (Popup) {
    Popup.button.setAttribute('aria-expanded', 'false')
    Popup.panel.remove()
    Popup = null
  }
}
function EnhanceSelect(Select) {
  const Wrapper = document.createElement('div')
  Wrapper.className = 'combo'
  Select.before(Wrapper)
  Wrapper.append(Select)
  Select.tabIndex = -1
  Select.setAttribute('aria-hidden', 'true')
  const Button = document.createElement('button')
  Button.type = 'button'
  Button.className = 'combo-button'
  Button.setAttribute('role', 'combobox')
  Button.setAttribute('aria-expanded', 'false')
  Button.setAttribute(
    'aria-label',
    Select.getAttribute('aria-label') || Select.closest('label')?.firstChild.textContent || Select.id,
  )
  const Label = document.createElement('span')
  Label.className = 'combo-label'
  const Arrow = document.createElement('span')
  Arrow.className = 'combo-arrow'
  Arrow.textContent = '⌄'
  Button.append(Label, Arrow)
  Wrapper.append(Button)
  Button.onclick = () => {
    if (Popup?.button === Button) {
      CloseCombo()
      return
    }
    CloseCombo()
    const Panel = document.createElement('div')
    Panel.className = 'combo-popup'
    const Search = document.createElement('input')
    Search.placeholder = 'Поиск…'
    Search.setAttribute('aria-label', 'Поиск вариантов')
    const List = document.createElement('div')
    List.className = 'combo-options'
    List.setAttribute('role', 'listbox')
    List.id = Select.id + '-options'
    Button.setAttribute('aria-controls', List.id)
    const Fill = () => {
      const Query = Search.value.toLocaleLowerCase()
      List.replaceChildren(
        ...[...Select.options]
          .filter((Option) => Option.textContent.toLocaleLowerCase().includes(Query))
          .map((Option) => {
            const Item = document.createElement('button')
            Item.type = 'button'
            Item.className = 'combo-option'
            Item.setAttribute('role', 'option')
            Item.setAttribute('aria-selected', String(Option.selected))
            Item.textContent = Option.textContent
            Item.disabled = Option.disabled
            Item.onclick = () => {
              Select.value = Option.value
              Select.dispatchEvent(new Event('change', { bubbles: true }))
              RefreshCombo(Select)
              CloseCombo()
              Button.focus()
            }
            return Item
          }),
      )
      if (!List.children.length) {
        const Empty = document.createElement('span')
        Empty.className = 'combo-no-results'
        Empty.textContent = 'Нет совпадений'
        List.append(Empty)
      }
    }
    Search.oninput = Fill
    Panel.append(Search, List)
    document.body.append(Panel)
    const Bounds = Button.getBoundingClientRect()
    const Height = Math.min(330, innerHeight - 30)
    Panel.style.width = Math.min(Math.max(Bounds.width, 250), innerWidth - 30) + 'px'
    Panel.style.left = Math.min(Bounds.left, innerWidth - parseFloat(Panel.style.width) - 15) + 'px'
    Panel.style.top =
      (innerHeight - Bounds.bottom > Height ? Bounds.bottom + 5 : Math.max(15, Bounds.top - Height - 5)) + 'px'
    Panel.style.maxHeight = Height + 'px'
    Popup = { panel: Panel, button: Button }
    Button.setAttribute('aria-expanded', 'true')
    Fill()
    Search.focus()
    Panel.onkeydown = (Event) => {
      if (Event.key === 'Escape') {
        Event.preventDefault()
        Event.stopPropagation()
        CloseCombo()
        Button.focus()
      }
      if (Event.key === 'ArrowDown' || Event.key === 'ArrowUp') {
        Event.preventDefault()
        const Items = [...List.querySelectorAll('button:not(:disabled)')]
        const Index = Items.indexOf(document.activeElement)
        Items[(Index + (Event.key === 'ArrowDown' ? 1 : -1) + Items.length) % Items.length]?.focus()
      }
      if (Event.key === 'Enter' && document.activeElement === Search) {
        Event.preventDefault()
        List.querySelector('button:not(:disabled)')?.click()
      }
    }
  }
  Select.addEventListener('change', () => RefreshCombo(Select))
  RefreshCombo(Select)
}
document.querySelectorAll('select').forEach(EnhanceSelect)
document.addEventListener('pointerdown', (Event) => {
  if (Popup && !Popup.panel.contains(Event.target) && !Popup.button.contains(Event.target)) CloseCombo()
})
Elements.close.onclick = () => window.magelight?.send('studioCommand', { action: 'close' })
document.querySelectorAll('[data-tab]').forEach((Button) => {
  Button.onclick = () => Tab(Button.dataset.tab)
})
Elements.actorPicker.onchange = () => SelectActor(Elements.actorPicker.value)
Elements.search.oninput = Render
Elements.sex.onchange = () => {
  Elements.slotSelect.value = ''
  Elements.nameSource.textContent = 'Случайное имя учитывает пол и расу создаваемого персонажа.'
  Render()
}
Elements.slotSelect.onchange = Render
Elements.creationCategory.onchange = () => {
  Elements.creationPreset.value = ''
  Render()
}
Elements.creationPreset.onchange = Render
Elements.presetCategory.onchange = () => {
  Elements.equipmentPreset.value = ''
  Render()
}
Elements.equipmentPreset.onchange = Render
Elements.refresh.onclick = () => Act('state')
Elements.equipmentRefresh.onclick = () => LoadEquipment()
Elements.openEquipment.onclick = () => Tab('equipment')
Elements.equipmentSearchForm.onsubmit = (Event) => {
  Event.preventDefault()
  LoadEquipment()
}
Elements.applyPreset.onclick = () => LoadEquipment('applyEquipmentPreset', { preset: Elements.equipmentPreset.value })
Elements.savePreset.onclick = () => {
  const Name = Elements.presetName.value.trim()
  if (!Name) return Message('Введите название набора', true)
  LoadEquipment('saveEquipmentPreset', { name: Name, category: Elements.saveCategory.value })
}
Elements.addCategory.onclick = () => {
  const Name = Elements.categoryName.value.trim()
  if (!Name) return Message('Введите название категории', true)
  Act('addCategory', { name: Name })
}
Elements.rename.onclick = () => Act('rename', { id: SelectedId, name: Elements.editName.value.trim() })
for (const Name of ['summon', 'park', 'teleport']) Elements[Name].onclick = () => Act(Name, { id: SelectedId })
async function RandomName(Existing) {
  try {
    const Result = await Send('randomName', Existing ? { id: SelectedId } : { female: Elements.sex.value === 'female' })
    Elements[Existing ? 'editName' : 'newName'].value = Result.generatedName.name
    Elements.nameSource.textContent = Result.generatedName.source.includes('Tamrielic')
      ? 'Имя предложено из установленного Tamrielic Names.'
      : Result.generatedName.source
    Message('Предложено имя: ' + Result.generatedName.name + '. Можно выбрать другое.')
  } catch (Failure) {
    Message(Failure.message, true)
  }
}
Elements.randomName.onclick = () => RandomName(false)
Elements.randomExistingName.onclick = () => RandomName(true)
Elements.createForm.onsubmit = async (Event) => {
  Event.preventDefault()
  if (MutationBusy) return
  const Name = Elements.newName.value.trim()
  if (!Name) return
  MutationBusy = true
  Equipment = null
  const Previous = new Set(State.slots.map((Slot) => Slot.identity))
  Render()
  try {
    await Send('create', {
      name: Name,
      female: Elements.sex.value === 'female',
      slot: Elements.slotSelect.value === '' ? null : Number(Elements.slotSelect.value),
      preset: Elements.creationPreset.value,
    })
    SelectedId = State.slots.find((Slot) => !Previous.has(Slot.identity))?.id ?? SelectedId
    Elements.newName.value = ''
    CurrentTab = 'roster'
    Message('NPC создан. Дождитесь проверки снаряжения и сохраните игру.')
  } catch (Failure) {
    Message(Failure.message, true)
  } finally {
    MutationBusy = false
    Render()
  }
}
Elements.deleteNpc.onclick = () => {
  const Actor = CurrentActor()
  if (!Actor || MutationBusy || EquipmentBusy) return
  DeletionTarget = { ...Actor }
  Render()
}
Elements.cancelDelete.onclick = () => {
  DeletionTarget = null
  Render()
}
Elements.confirmDelete.onclick = async () => {
  if (!DeletionTarget || MutationBusy || EquipmentBusy) return
  const Target = DeletionTarget
  MutationBusy = true
  Render()
  try {
    await Send('delete', { id: Target.id, identity: Target.identity, confirmed: true })
    Equipment = null
    EquipmentOwnerId = null
    DeletionTarget = null
    SelectedId = null
    Message('NPC удалён. История использования слота сохранена; сохраните игру.')
  } catch (Failure) {
    Message(Failure.message, true)
  } finally {
    MutationBusy = false
    Render()
  }
}
for (const Name of ['hotkeyKey', 'modifierShift', 'modifierCtrl', 'modifierAlt'])
  Elements[Name].addEventListener('change', () => {
    SettingsDirty = true
    Elements.hotkeyPreview.textContent = Chord(ReadSettings())
  })
Elements.resetSettings.onclick = () => {
  SettingsDirty = true
  Elements.hotkeyKey.value = '66'
  Elements.modifierShift.checked = true
  Elements.modifierCtrl.checked = false
  Elements.modifierAlt.checked = false
  RefreshCombo(Elements.hotkeyKey)
  Elements.hotkeyPreview.textContent = Chord(ReadSettings())
}
Elements.saveSettings.onclick = async () => {
  try {
    await Send('saveSettings', { settings: ReadSettings() })
    SettingsDirty = false
    Render()
    Message('Клавиши сохранены: ' + Chord(State.settings))
  } catch (Failure) {
    Message(Failure.message, true)
  }
}
window.magelight?.on('__uimode', (Value) => {
  if (String(Value) === '1') Send('state').catch((Failure) => Message(Failure.message, true))
})
setInterval(() => {
  if (State?.slots.some((Slot) => Slot.restoring) && !Pending.size)
    Send('state').catch((Failure) => Message(Failure.message, true))
}, 1500)
Send('state').catch((Failure) => Message(Failure.message, true))
