let LookFrameTimer = null
let LookFrameBusy = false
let LookFrameAgain = false
let LookTryPending = false
let LookResume = false
let HairSliderTimer = null
let HairObserver = null
let HairVisible = new Set()
let HairShot = null
let HairShotSequence = 0
let HairShotTimer = null
const HairImages = new Map()
const HairRetries = new Map()

function CancelLookFrameTick() {
  if (LookFrameTimer !== null) cancelAnimationFrame(LookFrameTimer)
  LookFrameTimer = null
}

function ClearLookPreview() {
  CancelLookFrameTick()
  CancelHairSlider()
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

function CancelHairSlider() {
  clearTimeout(HairSliderTimer)
  HairSliderTimer = null
}

function FlushHairSlider() {
  if (HairSliderTimer === null) return
  CancelHairSlider()
  QueueLookFrame(true)
}

function QueueLookFrame(TryOn = false, Resume = false) {
  if (!UIVisible || CurrentTab !== 'appearance' || !Appearance?.available || AppearanceBusy || Elements.hairPicker.open) return
  LookTryPending ||= TryOn
  LookResume ||= Resume
  LookFrameAgain = true
  if (!LookFrameBusy && LookFrameTimer === null) LookFrameTimer = requestAnimationFrame(ShowLookFrame)
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
  if (TryOn || Resume || Elements.appearanceImage.hidden)
    Elements.appearancePreviewStatus.textContent = T('Загрузка модели…')
  try {
    await Send(TryOn ? 'tryAppearance' : 'appearanceFrame', {
      ...Address, yaw: Number(Elements.appearanceYaw.value), pitch: LookPitch, zoom: Number(Elements.appearanceZoom.value),
      panX: Number(Elements.appearanceViewport.dataset.panX || 0), panY: Number(Elements.appearanceViewport.dataset.panY || 0),
      light: Elements.appearanceLight.value, resume: Resume,
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
    if (Elements.appearanceImage.getAttribute('src') !== Update.image) Elements.appearanceImage.src = Update.image
    Elements.appearanceImage.hidden = false
  }
  const Status = T(Update.error || (Update.image || !Elements.appearanceImage.hidden ? 'Живое превью · Phantasm' : 'Загрузка модели…'))
  if (Elements.appearancePreviewStatus.textContent !== Status) Elements.appearancePreviewStatus.textContent = Status
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
  }, { root: Elements.hairGrid, rootMargin: '140px 0px' })
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
      CancelHairSlider()
      Elements.hairStyle.value = Hair.id
      Elements.hairPicker.close()
      RenderHairChoice()
      QueueLookFrame(true, true)
    }
    HairObserver.observe(Card)
    return Card
  }))
  Elements.hairGrid.scrollTop = 0
}

async function StartHairShot() {
  if (HairShot || !Elements.hairPicker.open || !Appearance?.available || LookFrameBusy) return
  const Cards = [...HairVisible].filter(Node => {
    const Id = Number(Node.dataset.hair)
    return Node.isConnected && !HairImages.has(Id) && (HairRetries.get(Id) || 0) < 3
  })
  const Grid = Elements.hairGrid.getBoundingClientRect()
  const Fresh = Node => !HairRetries.has(Number(Node.dataset.hair))
  const Card = Cards.find(Node => {
    if (!Fresh(Node)) return false
    const Bounds = Node.getBoundingClientRect()
    return Bounds.bottom > Grid.top && Bounds.top < Grid.bottom
  }) || Cards.find(Fresh) || Cards[0]
  if (!Card) return
  const Id = Number(Card.dataset.hair)
  const Token = ++HairShotSequence
  HairShot = { Id, Token }
  HairShotTimer = setTimeout(() => RecoverHairShot(Token), 4000)
  try {
    const Result = await Send('hairThumbnail', { ...AppearanceAddress(), hair: Id, token: Token }, true)
    if (Result.hairThumbnail) FinishHairShot(Result.hairThumbnail)
  }
  catch (Failure) { FinishHairShot({ token: Token, error: Failure.message }) }
}

async function RecoverHairShot(Token) {
  if (HairShot?.Token !== Token) return
  try { await Send('hairThumbnailCancel', { token: Token }, true) }
  catch { /* Следующие карточки сохраняют собственные попытки. */ }
  FinishHairShot({ token: Token, error: 'timed-out' })
}

function FinishHairShot(Update) {
  if (!HairShot || HairShot.Token !== Update.token || Update.pending) return
  const { Id } = HairShot
  HairShot = null
  clearTimeout(HairShotTimer)
  if (['busy', 'view-drawing', 'timed-out'].includes(Update.error)) {
    HairRetries.set(Id, Update.error === 'timed-out' ? 3 : (HairRetries.get(Id) || 0) + 1)
    HairShotTimer = setTimeout(StartHairShot, Update.error === 'timed-out' ? 0 : 100)
    return
  }
  HairImages.set(Id, Update.image || false)
  while (HairImages.size > 512) HairImages.delete(HairImages.keys().next().value)
  const Card = Elements.hairGrid.querySelector('[data-hair="' + Id + '"]')
  if (Card) PaintHairCard(Card, Update.image || false)
  HairShotTimer = setTimeout(StartHairShot, 0)
}

function InitializeAppearancePreview() {
  Elements.hairStep.oninput = () => {
    const Index = Number(Elements.hairStep.value)
    if (Elements.hairStep.disabled || Index === Elements.hairStyle.selectedIndex) return
    Elements.hairStyle.selectedIndex = Index
    RenderHairChoice()
    // Длинное перетаскивание не должно пересобирать модель на каждом промежуточном шаге.
    CancelHairSlider()
    HairSliderTimer = setTimeout(FlushHairSlider, 120)
  }
  Elements.hairStep.onchange = FlushHairSlider
  Elements.openHairPicker.onclick = () => {
    if (!Appearance?.available) return
    FlushHairSlider()
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
}
