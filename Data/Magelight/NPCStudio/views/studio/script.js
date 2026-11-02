const Elements = Object.fromEntries([...document.querySelectorAll('[id]')].map((Element) => [Element.id, Element]))
let State = null
let SelectedId = null
let CurrentTab = 'create'
let UIVisible = true
let Equipment = null
let EquipmentOwnerId = null
let EquipmentBusy = false
let MutationBusy = false
let DeletionTarget = null
let SettingsDirty = false
let NextRequestId = 0
const Pending = new Map()
const Pages = {
  create: [T('СОЗДАНИЕ'), T('Новый персонаж')],
  roster: [T('ПОСТОЯННЫЙ РЕЗЕРВ'), T('Мои персонажи')],
  equipment: [T('ПРЕДМЕТЫ И ЭКИПИРОВКА'), T('Снаряжение')],
  presets: [T('ГОТОВЫЕ И СВОИ КОМПЛЕКТЫ'), T('Библиотека наборов')],
  settings: [T('ПАРАМЕТРЫ СТУДИИ'), T('Настройки')],
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
  clearTimeout(Message.timer)
  Elements.message.hidden = false
  Elements.message.textContent = T(Text)
  Message.timer = setTimeout(
    () => {
      Elements.message.hidden = true
    },
    IsError ? 14000 : 6500,
  )
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
function Send(Action, Payload = {}, Quiet = false) {
  if (!window.magelight) return Promise.reject(new Error(T('Нет подключения к игре')))
  if (Payload.id !== undefined && Payload.identity === undefined)
    Payload = { ...Payload, identity: State?.slots.find((Slot) => Slot.id === Payload.id)?.identity }
  const RequestId = ++NextRequestId
  return new Promise((Resolve, Reject) => {
    const Timeout = setTimeout(() => {
      Pending.delete(RequestId)
      Reject(new Error(T('Игра не ответила. Обновите данные перед повторным действием')))
    }, 15000)
    Pending.set(RequestId, { Resolve, Reject, Timeout, Quiet })
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
      const Failure = new Error(Response.error || T('Ошибка команды'))
      Request?.Reject(Failure)
      if (!Request?.Quiet) Message(Failure.message, true)
      return
    }
    State = Response.state
    if (State.portrait) Portraits.set(State.portrait.identity, State.portrait.portrait)
    if (State.preview) {
      PreviewFrame = State.preview
      if (PreviewFrame.portrait) Portraits.set(PreviewFrame.identity, PreviewFrame.portrait)
      while (Portraits.size > 80) Portraits.delete(Portraits.keys().next().value)
    }
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
        Option.textContent = T(Row.label)
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
  const Key = KeyOptions.find((Option) => Option.value === Settings?.key)?.label || T('Клавиша ') + Settings?.key
  return [Settings?.modifiers & 1 && 'Shift', Settings?.modifiers & 2 && 'Ctrl', Settings?.modifiers & 4 && 'Alt', Key]
    .filter(Boolean)
    .join(' + ')
}
const KeyOptions = [
  ...Array.from({ length: 10 }, (_, Index) => ({
    value: Index === 9 ? 11 : Index + 2,
    label: String((Index + 1) % 10),
  })),
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
  ApplyLocale(State.settings.language || 'ru')
  ApplyTheme(State.settings.theme || 'amethyst')
  Elements.notice.textContent =
    State.error || (!State.worldLoaded ? T('Загрузите сохранение или начните новую игру.') : '')
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
  Elements.pageEyebrow.textContent = T(Pages[CurrentTab][0])
  Elements.pageTitle.textContent = T(Pages[CurrentTab][1])
  if (SelectedId !== null && !CurrentActor()) {
    SelectedId = null
    Equipment = null
    DeletionTarget = null
  }
  Options(
    Elements.actorPicker,
    [
      { value: '', label: T('Не выбран') },
      ...State.slots.map((Slot) => ({
        value: Slot.id,
        label: Slot.name + ' · ' + (Slot.female ? T('Ж') : T('М')) + Slot.number,
      })),
    ],
    SelectedId ?? '',
  )
  Elements.actorPicker.closest('.combo').hidden = CurrentTab === 'create' || CurrentTab === 'settings'
  RenderCreation()
  RenderRoster()
  RenderPreview()
  SchedulePortrait()
  RenderLibrary()
  RenderEquipment()
  if (!SettingsDirty) {
    Options(Elements.hotkeyKey, KeyOptions, State.settings.key)
    Elements.language.value = State.settings.language || 'ru'
    Elements.theme.value = State.settings.theme || 'amethyst'
    RefreshCombo(Elements.language)
    RefreshCombo(Elements.theme)
    Elements.modifierShift.checked = !!(State.settings.modifiers & 1)
    Elements.modifierCtrl.checked = !!(State.settings.modifiers & 2)
    Elements.modifierAlt.checked = !!(State.settings.modifiers & 4)
  }
  Elements.hotkeyPreview.textContent = Chord(ReadSettings())
}
function RenderCreation() {
  const Female = Elements.sex.value === 'female'
  Options(
    Elements.creationRace,
    (State.races || []).map((Race) => ({ value: Race.id, label: RaceLabel(Race) })),
  )
  const Slots = State.availableSlots.filter((Slot) => Slot.female === Female)
  const Status = { fresh: T('новый'), used: T('использовался') }
  Options(Elements.slotSelect, [
    { value: '', label: T('Автоматически · сначала новые') },
    ...Slots.map((Slot) => ({ value: Slot.id, label: T('Слот ') + Slot.number + ' · ' + Status[Slot.history] })),
  ])
  const Slot = Slots.find((Slot) => String(Slot.id) === Elements.slotSelect.value)
  Elements.slotInfo.textContent = Slot
    ? T('Слот ') + Slot.number + ': ' + Status[Slot.history] + '.'
    : T('Свободно: ') + Slots.length + T('. Новые слоты имеют приоритет; занятые недоступны.')
  const Library = State.library
  Options(Elements.creationCategory, [
    { value: '', label: T('Все категории') },
    ...Library.categories.map((Name) => ({ value: Name, label: Name })),
  ])
  const Presets = Library.presets.filter(
    (Preset) => !Elements.creationCategory.value || Preset.category === Elements.creationCategory.value,
  )
  Options(Elements.creationPreset, [
    { value: '', label: T('Без комплекта') },
    ...Presets.map((Preset) => ({ value: Preset.id, label: Preset.name, disabled: !Preset.available })),
  ])
  const Preset = Library.presets.find((Item) => Item.id === Elements.creationPreset.value)
  Elements.creationPresetInfo.textContent = Preset
    ? T(Preset.error) ||
      T(Preset.category) + ' · ' + Preset.items.length + T(' предметов. Снаряжение не меняет фракцию или поведение.')
    : T('Персонаж появится без дополнительного снаряжения.')
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
      if (Portraits.has(Slot.identity)) {
        const Image = document.createElement('img')
        Image.src = Portraits.get(Slot.identity)
        Image.alt = ''
        Avatar.append(Image)
      } else Avatar.append(Icon('person'))
      const Info = document.createElement('span')
      const Name = document.createElement('strong')
      Name.textContent = Slot.name
      const Detail = document.createElement('small')
      Detail.textContent = [
        Slot.female ? T('Женский') : T('Мужской'),
        Slot.dead ? T('Погиб') : Slot.parked ? T('Скрыт') : T('В мире'),
      ].join(' · ')
      const Number = document.createElement('span')
      Number.className = 'slot-number'
      Number.textContent = T('Слот ') + Slot.number
      Info.append(Name, Detail)
      Button.append(Avatar, Info, Number)
      Button.onclick = () => SelectActor(Slot.id)
      return Button
    }),
  )
  Elements.empty.hidden = !!Visible.length
  const Actor = CurrentActor()
  Elements.properties.hidden = !Actor
  Elements.selectedName.textContent = Actor?.name || T('Не выбран')
  Elements.slotBadge.textContent = Actor ? (Actor.female ? T('Ж') : T('М')) + ' · ' + Actor.number : ''
  if (!Actor) return
  if (document.activeElement !== Elements.editName) Elements.editName.value = Actor.name
  Elements.race.textContent = RaceLabel({ id: Actor.raceId, name: Actor.race })
  Options(
    Elements.editRace,
    (State.races || []).map((Race) => ({ value: Race.id, label: RaceLabel(Race) })),
    Elements.editRace.dataset.actor === Actor.identity ? undefined : Actor.raceId,
  )
  Elements.editRace.dataset.actor = Actor.identity
  Elements.setRace.disabled = !CanChange()
  Elements.reference.textContent = Actor.reference
  Elements.status.textContent = Actor.dead ? T('Погиб') : Actor.parked ? T('Убран из мира') : T('В мире')
  Elements.actorWarning.textContent = T(Actor.warning || '')
  Elements.teleport.disabled = MutationBusy || Actor.parked
  Elements.summon.disabled = MutationBusy || Actor.dead
  Elements.park.disabled = MutationBusy || Actor.parked || Actor.restoring
  Elements.rename.disabled = MutationBusy
  Elements.deleteNpc.disabled = MutationBusy || EquipmentBusy
  if (DeletionTarget?.identity !== Actor.identity) DeletionTarget = null
  Elements.deleteConfirmation.hidden = !DeletionTarget
  Elements.deleteQuestion.textContent = DeletionTarget ? T('Удалить «') + DeletionTarget.name + '»?' : ''
  Elements.confirmDelete.disabled = MutationBusy || EquipmentBusy
  Elements.cancelDelete.disabled = MutationBusy
}
function RenderLibrary() {
  const Library = State.library
  Options(Elements.presetCategory, [
    { value: '', label: T('Все категории') },
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
    ? T(Selected.error) ||
      T(Selected.category) + ' · ' + Selected.items.length + T(' предметов. Повторное применение не накапливает копии.')
    : T('В этой категории пока нет наборов.')
  Elements.applyPreset.disabled = !CanChange() || !Selected?.available
  Elements.savePreset.disabled = !CanChange()
  Elements.presetCards.replaceChildren(
    ...Presets.map((Preset) => {
      const Button = document.createElement('button')
      Button.className = 'preset-card' + (Preset.id === Selected?.id ? ' selected' : '')
      const Info = document.createElement('span')
      const Name = document.createElement('strong')
      Name.textContent = Preset.id.startsWith('user-') ? Preset.name : T(Preset.name)
      const Detail = document.createElement('small')
      Detail.textContent = Preset.available
        ? Preset.items.length + T(' предметов · ') + Preset.category
        : T(Preset.error)
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
    T(Actor?.warning || 'Вещи хранятся в обычном сохранении Skyrim.') +
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
    Title.textContent = Item.name + (Inventory ? ' × ' + Item.count + (Item.worn ? T(' · надето') : '') : '')
    const Source = document.createElement('small')
    Source.textContent = Item.plugin + ' | ' + Item.form.toString(16).toUpperCase().padStart(6, '0')
    const Button = document.createElement('button')
    Button.textContent = Inventory && Item.worn ? T('Снять') : Inventory ? T('Надеть') : T('Выдать')
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
  Elements.equipmentMatches.textContent = T('Найдено: ') + Equipment.matches + T(' · показаны первые 100')
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
    if (Action === 'setRace') InvalidatePortrait(CurrentActor()?.identity)
    Message(T('Изменения применены. Сохраните игру.'))
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
    if (Action !== 'equipment') InvalidatePortrait(CurrentActor()?.identity)
    if (Action !== 'equipment')
      Message(
        Action === 'saveEquipmentPreset'
          ? T('Набор сохранён в библиотеке.')
          : T('Снаряжение обновлено. Сохраните игру.'),
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
    key: Number(Elements.hotkeyKey.value || 9),
    language: Elements.language.value || State.settings.language,
    theme: Elements.theme.value || State.settings.theme,
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
  Button.querySelector('.combo-label').textContent = Select.selectedOptions[0]?.textContent || T('Нет вариантов')
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
    Search.placeholder = T('Поиск…')
    Search.setAttribute('aria-label', T('Поиск вариантов'))
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
        Empty.textContent = T('Нет совпадений')
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
Elements.close.onclick = () => {
  UIVisible = false
  window.magelight?.send('studioCommand', { action: 'close' })
}
document.querySelectorAll('[data-tab]').forEach((Button) => {
  Button.onclick = () => Tab(Button.dataset.tab)
})
Elements.actorPicker.onchange = () => SelectActor(Elements.actorPicker.value)
Elements.search.oninput = Render
Elements.sex.onchange = () => {
  Elements.slotSelect.value = ''
  Elements.nameSource.textContent = T('Случайное имя учитывает пол и расу создаваемого персонажа.')
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
  if (!Name) return Message(T('Введите название набора'), true)
  LoadEquipment('saveEquipmentPreset', { name: Name, category: Elements.saveCategory.value })
}
Elements.addCategory.onclick = () => {
  const Name = Elements.categoryName.value.trim()
  if (!Name) return Message(T('Введите название категории'), true)
  Act('addCategory', { name: Name })
}
Elements.setRace.onclick = () => Act('setRace', { id: SelectedId, race: Elements.editRace.value })
Elements.rename.onclick = () => Act('rename', { id: SelectedId, name: Elements.editName.value.trim() })
for (const Name of ['summon', 'park', 'teleport']) Elements[Name].onclick = () => Act(Name, { id: SelectedId })
async function RandomName(Existing) {
  try {
    const Result = await Send(
      'randomName',
      Existing ? { id: SelectedId } : { female: Elements.sex.value === 'female', race: Elements.creationRace.value },
    )
    Elements[Existing ? 'editName' : 'newName'].value = Result.generatedName.name
    Elements.nameSource.textContent = Result.generatedName.source.includes('Tamrielic')
      ? T('Имя предложено из установленного Tamrielic Names.')
      : Result.generatedName.source
    Message(T('Предложено имя: ') + Result.generatedName.name + T('. Можно выбрать другое.'))
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
      race: Elements.creationRace.value,
    })
    SelectedId = State.slots.find((Slot) => !Previous.has(Slot.identity))?.id ?? SelectedId
    Elements.newName.value = ''
    CurrentTab = 'roster'
    Message(T('NPC создан. Дождитесь проверки снаряжения и сохраните игру.'))
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
    Message(T('NPC удалён. История использования слота сохранена; сохраните игру.'))
  } catch (Failure) {
    Message(Failure.message, true)
  } finally {
    MutationBusy = false
    Render()
  }
}
for (const Name of ['hotkeyKey', 'modifierShift', 'modifierCtrl', 'modifierAlt', 'language', 'theme'])
  Elements[Name].addEventListener('change', () => {
    SettingsDirty = true
    Elements.hotkeyPreview.textContent = Chord(ReadSettings())
  })
Elements.resetSettings.onclick = () => {
  SettingsDirty = true
  Elements.hotkeyKey.value = '9'
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
    Message(T('Клавиши сохранены: ') + Chord(State.settings))
  } catch (Failure) {
    Message(Failure.message, true)
  }
}
window.magelight?.on('__uimode', (Value) => {
  UIVisible = String(Value) === '1'
  if (!UIVisible) {
    clearTimeout(PortraitTimer)
    PortraitTimer = null
    clearTimeout(CameraTimer)
    CameraTimer = null
  }
  if (String(Value) === '1') {
    PreviewAttempt = ''
    PreviewFrame = null
    Portraits.clear()
    PortraitAttempts.clear()
    PickTip()
    Send('state').catch((Failure) => Message(Failure.message, true))
  }
})
setInterval(() => {
  if (UIVisible && State?.slots.some((Slot) => Slot.restoring) && !Pending.size)
    Send('state').catch((Failure) => Message(Failure.message, true))
}, 1500)
PickTip()

function InvalidatePortrait(Identity) {
  if (!Identity) return
  Portraits.delete(Identity)
  PortraitAttempts.delete(Identity)
  if (PreviewFrame?.identity === Identity) {
    PreviewFrame = null
    PreviewAttempt = ''
  }
}
const Portraits = new Map()
const PortraitAttempts = new Set()
let PortraitTimer = null
let PortraitBusy = false
function SchedulePortrait() {
  if (
    !UIVisible ||
    PortraitTimer ||
    PortraitBusy ||
    PreviewBusy ||
    CurrentTab !== 'roster' ||
    Pending.size ||
    MutationBusy
  )
    return
  const Query = Elements.search.value.trim().toLocaleLowerCase()
  const Actor = State?.slots
    .filter((Slot) => Slot.name.toLocaleLowerCase().includes(Query))
    .slice(0, 24)
    .find(
      (Slot) =>
        !Slot.parked &&
        !Slot.restoring &&
        !Slot.dead &&
        !Portraits.has(Slot.identity) &&
        !PortraitAttempts.has(Slot.identity),
    )
  if (!Actor) return
  PortraitTimer = setTimeout(async () => {
    PortraitTimer = null
    if (!UIVisible || CurrentTab !== 'roster' || PreviewBusy || MutationBusy || Pending.size) return
    PortraitAttempts.add(Actor.identity)
    PortraitBusy = true
    try {
      await Send('portrait', { id: Actor.id, identity: Actor.identity }, true)
    } catch {
    } finally {
      PortraitBusy = false
      SchedulePortrait()
    }
  }, 450)
}
let PreviewFrame = null
let PreviewBusy = false
let PreviewAttempt = ''
let PreviewError = ''
let PreviewAgain = false
function RenderPreview() {
  const Actor = CurrentActor()
  const Valid = Actor && !Actor.restoring && PreviewFrame?.identity === Actor.identity
  Elements.previewImage.hidden = !Valid
  Elements.previewEmpty.hidden = !!Valid
  if (Valid && Elements.previewImage.getAttribute('src') !== PreviewFrame.image)
    Elements.previewImage.src = PreviewFrame.image
  Elements.previewStatus.textContent = PreviewBusy
    ? T('Загрузка модели…')
    : PreviewError ||
      (Valid
        ? T('Снимок модели · частей: ') +
          PreviewFrame.meshes +
          (PreviewFrame.skipped ? T(' · пропущено: ') + PreviewFrame.skipped : '')
        : T('Для превью нужна загруженная модель NPC.'))
  Elements.previewRefresh.disabled = !Actor || Actor.parked || Actor.dead || Actor.restoring || PreviewBusy
  if (
    UIVisible &&
    CurrentTab === 'roster' &&
    Actor &&
    !Actor.parked &&
    !Actor.restoring &&
    !PreviewBusy &&
    PreviewAttempt !== Actor.identity
  ) {
    PreviewAttempt = Actor.identity
    setTimeout(() => RequestPreview(true), 0)
  }
}
async function RequestPreview(Capture = false) {
  const Actor = CurrentActor()
  if (!UIVisible || !Actor || Actor.parked || Actor.restoring || CurrentTab !== 'roster') return
  PortraitAttempts.delete(Actor.identity)
  if (PreviewBusy) {
    PreviewAgain = true
    return
  }
  if (Capture) Portraits.delete(Actor.identity)
  PreviewAttempt = Actor.identity
  PreviewBusy = true
  PreviewError = ''
  RenderPreview()
  try {
    await Send('preview', {
      id: Actor.id,
      capture: Capture,
      yaw: Number(Elements.previewYaw.value),
      zoom: Number(Elements.previewZoom.value),
      light: Number(Elements.previewLight.value),
    })
  } catch (Failure) {
    PreviewError = T(Failure.message)
  } finally {
    PreviewBusy = false
    RenderPreview()
    SchedulePortrait()
    if (PreviewAgain) {
      PreviewAgain = false
      RequestPreview(false)
    }
  }
}
Elements.previewRefresh.onclick = () => RequestPreview(true)
let CameraTimer
for (const Name of ['previewYaw', 'previewZoom'])
  Elements[Name].addEventListener('input', () => {
    if (!CameraTimer)
      CameraTimer = setTimeout(() => {
        CameraTimer = null
        RequestPreview()
      }, 180)
  })
Elements.previewLight.addEventListener('change', () => RequestPreview())
let Drag = null
Elements.previewViewport.onpointerdown = (Event) => {
  if (Event.button !== 0 || !CurrentActor()) return
  Drag = { x: Event.clientX, yaw: Number(Elements.previewYaw.value) }
  Elements.previewViewport.setPointerCapture(Event.pointerId)
}
Elements.previewViewport.onpointermove = (Event) => {
  if (!Drag) return
  Elements.previewYaw.value = String(((Drag.yaw + (Event.clientX - Drag.x) * 0.6 + 540) % 360) - 180)
  if (!CameraTimer)
    CameraTimer = setTimeout(() => {
      CameraTimer = null
      RequestPreview()
    }, 120)
}
Elements.previewViewport.onpointerup = () => {
  if (Drag) {
    Drag = null
    clearTimeout(CameraTimer)
    CameraTimer = null
    RequestPreview()
  }
}
Elements.previewViewport.onpointercancel = () => {
  Drag = null
}

Send('state').catch((Failure) => Message(Failure.message, true))
