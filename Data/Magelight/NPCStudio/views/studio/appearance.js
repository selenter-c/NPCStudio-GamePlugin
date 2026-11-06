let LookFrameTimer = null
let LookFrameBusy = false
let LookFrameAgain = false
let LookTryPending = false
let LookResume = false
let LookYaw = 0, LookPitch = 0, LookZoom = 3
let LookDrag = null
let HairObserver = null
let HairVisible = new Set()
let HairShot = null
let HairShotSequence = 0
let HairShotTimer = null
const HairImages = new Map()
const HairRetries = new Map()

function ClearLookPreview() {
  clearTimeout(LookFrameTimer)
  LookFrameTimer = null
  LookFrameBusy = false
  LookFrameAgain = false
  LookTryPending = false
  LookResume = false
  Elements.appearanceImage.hidden = true
  Elements.appearanceImage.removeAttribute('src')
  Elements.appearancePreviewStatus.textContent = ''
  StopHairShots()
  if (Elements.hairPicker.open) Elements.hairPicker.close()
}

function QueueLookFrame(TryOn = false, Resume = false) {
  if (!UIVisible || CurrentTab !== 'appearance' || !Appearance?.available || AppearanceBusy || Elements.hairPicker.open) return
  LookTryPending ||= TryOn
  LookResume ||= Resume
  LookFrameAgain = true
  if (LookFrameBusy) return
  clearTimeout(LookFrameTimer)
  LookFrameTimer = setTimeout(ShowLookFrame, TryOn ? 90 : 16)
}

async function ShowLookFrame() {
  LookFrameTimer = null
  if (!UIVisible || !Appearance?.available || CurrentTab !== 'appearance' || AppearanceBusy || Elements.hairPicker.open) return
  const Address = AppearanceAddress()
  if (!Address) return
  const Revision = AppearanceRevision
  const TryOn = LookTryPending
  const Resume = LookResume
  LookTryPending = LookResume = LookFrameAgain = false
  LookFrameBusy = true
  Elements.appearancePreviewStatus.textContent = T('Загрузка модели…')
  try {
    await Send(TryOn ? 'tryAppearance' : 'appearanceFrame', {
      ...Address, yaw: LookYaw, pitch: LookPitch, zoom: LookZoom, panY: .3, resume: Resume,
      ...(TryOn ? { hair: Number(Elements.hairStyle.value), color: Number(Elements.hairColor.value) } : {}),
    }, true)
  } catch (Failure) {
    if (Revision === AppearanceRevision && CurrentTab === 'appearance')
      Elements.appearancePreviewStatus.textContent = T(Failure.message)
  } finally {
    if (Revision === AppearanceRevision) {
      LookFrameBusy = false
      if (Elements.hairPicker.open) StartHairShot()
      else if (LookFrameAgain) QueueLookFrame()
    }
  }
}

function ReceiveLookFrame(Update) {
  if (CurrentTab !== 'appearance' || Appearance?.previewIdentity !== Update.identity || Elements.hairPicker.open) return
  if (Update.image) {
    Elements.appearanceImage.src = Update.image
    Elements.appearanceImage.hidden = false
  }
  Elements.appearancePreviewStatus.textContent = T(Update.error || (Update.image ? 'Живое превью · Phantasm' : 'Загрузка модели…'))
}

function PaintHairCard(Card, Image) {
  const Thumb = Card.querySelector('.hair-thumb')
  Thumb.replaceChildren()
  if (Image) {
    const Picture = document.createElement('img')
    Picture.alt = ''
    Picture.draggable = false
    Picture.src = Image
    Thumb.append(Picture)
  } else {
    Thumb.append(Icon('person'))
    if (Image === false) Thumb.title = T('Модель причёски недоступна')
  }
}

function StopHairShots() {
  HairObserver?.disconnect()
  HairObserver = null
  HairVisible.clear()
  HairShot = null
  clearTimeout(HairShotTimer)
  HairRetries.clear()
}

function RenderHairGrid() {
  HairObserver?.disconnect()
  HairVisible.clear()
  const Query = Elements.hairSearch.value.trim().toLocaleLowerCase()
  const Rows = Appearance.hairs.filter(Hair => (Hair.name + ' ' + (Hair.plugin || '')).toLocaleLowerCase().includes(Query))
  Elements.hairMatches.textContent = T('Найдено: ') + Rows.length
  HairObserver = new IntersectionObserver(Entries => {
    for (const Entry of Entries) {
      if (Entry.isIntersecting) HairVisible.add(Entry.target)
      else HairVisible.delete(Entry.target)
    }
    StartHairShot()
  }, { root: Elements.hairGrid })
  Elements.hairGrid.replaceChildren(...Rows.map(Hair => {
    const Card = document.createElement('button')
    Card.type = 'button'
    Card.className = 'hair-card'
    Card.dataset.hair = Hair.id
    Card.setAttribute('aria-pressed', String(Number(Elements.hairStyle.value) === Hair.id))
    const Thumb = document.createElement('span')
    Thumb.className = 'hair-thumb'
    const Label = document.createElement('strong')
    Label.textContent = Hair.name
    const Plugin = document.createElement('small')
    Plugin.textContent = Hair.plugin || ''
    Card.append(Thumb, Label, Plugin)
    PaintHairCard(Card, HairImages.get(Hair.id))
    Card.onclick = () => {
      Elements.hairStyle.value = Hair.id
      Elements.hairPicker.close()
      RenderAppearance()
      QueueLookFrame(true, true)
    }
    HairObserver.observe(Card)
    return Card
  }))
  Elements.hairGrid.scrollTop = 0
}

async function StartHairShot() {
  if (HairShot || !Elements.hairPicker.open || !Appearance?.available || LookFrameBusy) return
  const Card = [...HairVisible].find(Node => {
    const Id = Number(Node.dataset.hair)
    return !HairImages.has(Id) && (HairRetries.get(Id) || 0) < 3
  })
  if (!Card) return
  const Id = Number(Card.dataset.hair)
  const Token = ++HairShotSequence
  HairShot = { Id, Token }
  HairShotTimer = setTimeout(() => FinishHairShot({ token: Token, error: 'timed-out' }), 6500)
  try { await Send('hairThumbnail', { ...AppearanceAddress(), hair: Id, token: Token }, true) }
  catch (Failure) { FinishHairShot({ token: Token, error: Failure.message }) }
}

function FinishHairShot(Update) {
  if (!HairShot || HairShot.Token !== Update.token || Update.pending) return
  const { Id } = HairShot
  HairShot = null
  clearTimeout(HairShotTimer)
  if (['busy', 'view-drawing'].includes(Update.error)) {
    HairRetries.set(Id, (HairRetries.get(Id) || 0) + 1)
    HairShotTimer = setTimeout(StartHairShot, 200)
    return
  }
  if (Update.error === 'timed-out') {
    // Провайдер может ещё держать снимок. При следующем открытии карточку можно запросить снова.
    HairObserver?.disconnect()
    HairVisible.clear()
    return
  }
  HairImages.set(Id, Update.image || false)
  while (HairImages.size > 512) HairImages.delete(HairImages.keys().next().value)
  const Card = Elements.hairGrid.querySelector('[data-hair="' + Id + '"]')
  if (Card) PaintHairCard(Card, Update.image || false)
  HairShotTimer = setTimeout(StartHairShot, 50)
}

function InitializeAppearancePreview() {
  Elements.openHairPicker.onclick = () => {
    if (!Appearance?.available) return
    Elements.hairPicker.showModal()
    Elements.hairSearch.value = ''
    RenderHairGrid()
    Elements.hairSearch.focus()
  }
  Elements.closeHairPicker.onclick = () => Elements.hairPicker.close()
  Elements.hairPicker.addEventListener('close', () => {
    StopHairShots()
    QueueLookFrame(false, true)
  })
  Elements.hairSearch.oninput = RenderHairGrid
  const Viewport = Elements.appearanceViewport
  Viewport.onpointerdown = Event => {
    if (Event.button !== 0 || Elements.appearanceImage.hidden) return
    LookDrag = { x: Event.clientX, y: Event.clientY, yaw: LookYaw, pitch: LookPitch }
    Viewport.setPointerCapture(Event.pointerId)
  }
  Viewport.onpointermove = Event => {
    if (!LookDrag) return
    LookYaw = ((LookDrag.yaw + (Event.clientX - LookDrag.x) * .6 + 540) % 360) - 180
    LookPitch = Math.max(-75, Math.min(75, LookDrag.pitch + (Event.clientY - LookDrag.y) * .25))
    QueueLookFrame()
  }
  Viewport.onpointerup = Viewport.onpointercancel = () => { LookDrag = null }
  Viewport.addEventListener('wheel', Event => {
    if (Elements.appearanceImage.hidden) return
    Event.preventDefault()
    LookZoom = Math.max(.25, Math.min(4, LookZoom * (Event.deltaY < 0 ? 1.12 : 1 / 1.12)))
    QueueLookFrame()
  }, { passive: false })
  Elements.appearanceCameraReset.onclick = () => {
    LookYaw = LookPitch = 0
    LookZoom = 3
    QueueLookFrame()
  }
}
