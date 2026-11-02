const Elements = Object.fromEntries(Array.from(document.querySelectorAll('[id]')).map(Element => [Element.id, Element]))
let State = null
let SelectedId = null
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
    Button.onclick = () => { SelectedId = Slot.id; Render() }
    Elements.list.append(Button)
  }
  const Selected = State.slots.find(Slot => Slot.id === SelectedId)
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
  } catch (ErrorValue) { Message(ErrorValue.message, true); Render() }
}
for (const Name of ['summon', 'park', 'teleport']) Elements[Name].onclick = () => Action(Name, { id: SelectedId })
Elements.rename.onclick = () => Action('rename', { id: SelectedId, name: Elements.editName.value.trim() })
window.magelight?.on('__uimode', Value => { if (String(Value) === '1') Action('state') })
Send('state').catch(ErrorValue => Message(ErrorValue.message, true))
