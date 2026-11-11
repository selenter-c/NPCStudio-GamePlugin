let LookFrameTimer = null
let LookFrameBusy = false
let LookFrameAgain = false
let LookTryPending = false
let HairSliderTimer = null
let HairObserver = null
let HairVisible = new Set()
let HairShot = null
let HairShotSequence = 0
let HairShotTimer = null
const HairImages = new Map()
const HairRetries = new Map()
const HairCacheChecked = new Set()
let HairCacheBusy = false
let HairGalleryRevision = 0
let TryHairOnClose = false

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

function QueueLookFrame(TryOn = false) {
  if (!UIVisible || CurrentTab !== 'appearance' || !Appearance?.available || AppearanceBusy || Elements.hairPicker.open) return
  LookTryPending ||= TryOn
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
  LookTryPending = LookFrameAgain = false
  LookFrameBusy = true
  if (Elements.appearanceImage.hidden)
    Elements.appearancePreviewStatus.textContent = T('Загрузка модели…')
  try {
    await Send(TryOn ? 'tryAppearance' : 'appearanceFrame', {
      ...Address, yaw: Number(Elements.appearanceYaw.value), pitch: LookPitch, zoom: Number(Elements.appearanceZoom.value),
      panX: Number(Elements.appearanceViewport.dataset.panX || 0), panY: Number(Elements.appearanceViewport.dataset.panY || 0),
      light: Elements.appearanceLight.value, motion: Elements.appearanceMotion.value === 'on',
      ...(TryOn ? DraftAppearance() : {}),
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
  if (CurrentTab !== 'appearance' || Appearance?.previewIdentity !== Update.identity) return
  if (Update.image) {
    if (Elements.appearanceImage.getAttribute('src') !== Update.image) Elements.appearanceImage.src = Update.image
    Elements.appearanceImage.hidden = false
  } else if (Update.waiting || Update.error) Elements.appearanceImage.hidden = true
  const Status = T(Update.error || (Update.waiting ? 'Рендер ожидает свободного места…' :
    Update.image || !Elements.appearanceImage.hidden ? 'Живое превью · Phantasm' : 'Загрузка модели…'))
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
  ++HairGalleryRevision
  HairCacheBusy = false
  HairObserver?.disconnect()
  HairObserver = null
  HairVisible.clear()
  if (HairShot) Send('hairThumbnailCancel', { token: HairShot.Token }, true).catch(() => {})
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
      RenderHairChoice()
      TryHairOnClose = true
      Elements.hairPicker.close()
    }
    HairObserver.observe(Card)
    return Card
  }))
  Elements.hairGrid.scrollTop = 0
}

function RememberHairImage(Id, Image) {
  HairImages.set(Id, Image)
  while (HairImages.size > 512) {
    const Oldest = HairImages.keys().next().value
    HairImages.delete(Oldest)
    HairCacheChecked.delete(Oldest)
  }
  const Card = Elements.hairGrid.querySelector('[data-hair="' + Id + '"]')
  if (Card) PaintHairCard(Card, Image)
}

async function LoadHairCache(Cards) {
  const Ids = Cards.map(Node => Number(Node.dataset.hair)).filter(Id => !HairCacheChecked.has(Id)).slice(0, 8)
  if (HairCacheBusy || !Ids.length) return
  const Revision = HairGalleryRevision
  HairCacheBusy = true
  try {
    const Result = await Send('hairThumbnailCache', { ...AppearanceAddress(), hairs: Ids }, true)
    if (Revision !== HairGalleryRevision) return
    for (const [Id, Image] of Object.entries(Result.hairThumbnails || {})) RememberHairImage(Number(Id), Image)
  } catch {
    // При ошибке пакетного чтения остаётся обычный запрос снимка.
  } finally {
    if (Revision === HairGalleryRevision) {
      HairCacheBusy = false
      for (const Id of Ids) HairCacheChecked.add(Id)
      StartHairShot()
    }
  }
}

async function StartHairShot() {
  if (!Elements.hairPicker.open || !Appearance?.available) return
  const Cards = [...HairVisible].filter(Node => {
    const Id = Number(Node.dataset.hair)
    return Node.isConnected && !HairImages.has(Id) && (HairRetries.get(Id) || 0) < 3
  })
  const Grid = Elements.hairGrid.getBoundingClientRect()
  const Visible = Node => {
    const Bounds = Node.getBoundingClientRect()
    return Bounds.bottom > Grid.top && Bounds.top < Grid.bottom
  }
  const OnScreen = Cards.filter(Visible)
  LoadHairCache([...OnScreen, ...Cards.filter(Node => !OnScreen.includes(Node))])
  if (HairShot || LookFrameBusy) return
  const Ready = Cards.filter(Node => HairCacheChecked.has(Number(Node.dataset.hair)))
  const Fresh = Node => !HairRetries.has(Number(Node.dataset.hair))
  const Card = Ready.find(Node => Fresh(Node) && OnScreen.includes(Node)) || Ready.find(Fresh) || Ready[0]
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
  if (['busy', 'timed-out'].includes(Update.error)) {
    HairRetries.set(Id, Update.error === 'timed-out' ? 3 : (HairRetries.get(Id) || 0) + 1)
    HairShotTimer = setTimeout(StartHairShot, Update.error === 'timed-out' ? 0 : 100)
    return
  }
  RememberHairImage(Id, Update.image || false)
  HairShotTimer = setTimeout(StartHairShot, 0)
}

let LookCategory = 'hair'
let LookSkin = -1
let FaceGalleryKey = ''
let HoveredLookSlider = null
const LookTabs = [...document.querySelectorAll('[data-look-tab]')]
const LookPanels = [...document.querySelectorAll('[data-look-panel]')]
let UpdateFaceTrack
let UpdateSkinTrack

function ResetLookControls() {
  LookSkin = Appearance?.skin?.value ?? -1
  Elements.faceSearch.value = ''
  FaceGalleryKey = ''
}

function FocusLook(Face) {
  Elements.appearanceZoom.value = Face ? '4' : '1'
  Elements.appearanceViewport.dataset.panX = '0'
  Elements.appearanceViewport.dataset.panY = Face ? '.32' : '0'
  Elements.lookFace.setAttribute('aria-pressed', String(Face))
  Elements.lookFull.setAttribute('aria-pressed', String(!Face))
  QueueLookFrame()
}

function ChangeLookCategory(Key) {
  if (Key === LookCategory) return
  FlushHairSlider()
  LookCategory = Key
  Elements.faceSearch.value = ''
  RenderLookControls()
  if (Key !== 'hair') FocusLook(Key !== 'height')
}

function RenderLookStep(Slider, Count, Update, Options, Value) {
  const Index = Math.max(0, Options.findIndex(Option => Option.id === Value))
  Slider.max = String(Math.max(0, Options.length - 1))
  Slider.value = String(Index)
  Slider.disabled = AppearanceBusy || Options.length < 2
  Count.value = (Options.length ? Index + 1 : 0) + ' / ' + Options.length
  Slider.setAttribute('aria-valuetext', T(Options[Index]?.name || '') + ' · ' + Count.value)
  Update()
}

function RenderLookControls() {
  if (!Appearance?.available) return
  const Parts = Appearance.faceParts || {}
  const Skin = Appearance.skin?.options || []
  const Available = Key => Key === 'hair' || Key === 'height' || (Key === 'skin' ? Skin.length > 1 : !!Parts[Key])
  if (!Available(LookCategory)) LookCategory = 'hair'
  for (const Tab of LookTabs) {
    Tab.hidden = !Available(Tab.dataset.lookTab)
    Tab.setAttribute('aria-pressed', String(Tab.dataset.lookTab === LookCategory))
  }
  const Part = Parts[LookCategory]
  for (const Panel of LookPanels)
    Panel.hidden = Panel.dataset.lookPanel !== (Part ? 'parts' : LookCategory)
  if (LookCategory === 'skin') {
    const Current = Skin.find(Option => Option.id === LookSkin)
    Elements.skinChoiceName.textContent = T(Current?.name || '')
    RenderLookStep(Elements.skinStep, Elements.skinStepCount, UpdateSkinTrack, Skin, LookSkin)
    const PaletteKey = JSON.stringify(Skin)
    if (Elements.skinSwatches.dataset.palette !== PaletteKey) {
      Elements.skinSwatches.dataset.palette = PaletteKey
      Elements.skinSwatches.replaceChildren(...Skin.map(Option => {
        const Button = document.createElement('button')
        Button.type = 'button'
        Button.className = 'hair-swatch'
        Button.dataset.tone = String(Option.id)
        Button.style.setProperty('--swatch', Option.rgb)
        Button.onclick = () => ChooseSkin(Option.id)
        return Button
      }))
    }
    for (const [Index, Button] of [...Elements.skinSwatches.children].entries()) {
      Button.disabled = AppearanceBusy
      Button.title = T(Skin[Index].name)
      Button.setAttribute('aria-label', Button.title)
      Button.setAttribute('aria-pressed', String(Number(Button.dataset.tone) === LookSkin))
    }
  }
  if (!Part) return
  const Value = Number(Elements[LookCategory].value)
  Elements.faceChoiceName.textContent = T(Part.options.find(Option => Option.id === Value)?.name || '')
  RenderLookStep(Elements.faceStep, Elements.faceStepCount, UpdateFaceTrack, Part.options, Value)
  Elements.faceSearch.disabled = AppearanceBusy
  const Query = Elements.faceSearch.value.trim().toLocaleLowerCase()
  const Key = LookCategory + ':' + Query + ':' + (document.documentElement.lang || '')
  if (FaceGalleryKey !== Key) {
    FaceGalleryKey = Key
    const Rows = Part.options.filter(Option => (T(Option.name) + ' ' + (Option.plugin || '')).toLocaleLowerCase().includes(Query))
    Elements.faceChoices.replaceChildren(...Rows.map(Option => {
      const Button = document.createElement('button')
      Button.type = 'button'
      Button.dataset.part = String(Option.id)
      const Title = document.createElement('strong')
      Title.textContent = T(Option.name)
      Button.append(Title)
      if (Option.plugin) {
        const Source = document.createElement('small')
        Source.textContent = Option.plugin
        Button.append(Source)
      }
      Button.onclick = () => ChooseFacePart(Option.id)
      return Button
    }))
    Elements.faceNoResults.hidden = Rows.length > 0
  }
  for (const Button of Elements.faceChoices.children) {
    Button.disabled = AppearanceBusy
    Button.setAttribute('aria-pressed', String(Number(Button.dataset.part) === Value))
  }
}

function ScheduleLookTryOn() {
  CancelHairSlider()
  HairSliderTimer = setTimeout(FlushHairSlider, 120)
}
function ChooseFacePart(Id, Delayed = false) {
  if (!Appearance?.faceParts?.[LookCategory] || AppearanceBusy) return
  Elements[LookCategory].value = String(Id)
  RenderLookControls()
  RenderHairChoice()
  if (Delayed) ScheduleLookTryOn()
  else { CancelHairSlider(); QueueLookFrame(true) }
}
function ChooseSkin(Id, Delayed = false) {
  if (!Appearance?.skin || AppearanceBusy) return
  LookSkin = Id
  RenderLookControls()
  RenderHairChoice()
  if (Delayed) ScheduleLookTryOn()
  else { CancelHairSlider(); QueueLookFrame(true) }
}

function InitializeAppearancePreview() {
  UpdateFaceTrack = StyleRange(Elements.faceStep)
  UpdateSkinTrack = StyleRange(Elements.skinStep)
  for (const Tab of LookTabs) Tab.onclick = () => ChangeLookCategory(Tab.dataset.lookTab)
  Elements.lookFull.onclick = () => FocusLook(false)
  Elements.lookFace.onclick = () => FocusLook(true)
  Elements.faceSearch.oninput = RenderLookControls
  Elements.faceStep.oninput = () => {
    const Option = Appearance?.faceParts?.[LookCategory]?.options[Number(Elements.faceStep.value)]
    if (Option) ChooseFacePart(Option.id, true)
  }
  Elements.skinStep.oninput = () => {
    const Option = Appearance?.skin?.options[Number(Elements.skinStep.value)]
    if (Option) ChooseSkin(Option.id, true)
  }
  Elements.faceStep.onchange = Elements.skinStep.onchange = FlushHairSlider
  for (const Slider of [Elements.hairStep, Elements.faceStep, Elements.skinStep, Elements.npcHeight]) {
    const Track = Slider.parentElement
    Track.addEventListener('pointerenter', () => { HoveredLookSlider = Slider })
    Track.addEventListener('pointerleave', () => { if (HoveredLookSlider === Slider) HoveredLookSlider = null })
  }
  document.addEventListener('keydown', KeyEvent => {
    const Slider = HoveredLookSlider
    if (!Slider || Slider.disabled || !Slider.getClientRects().length || CurrentTab !== 'appearance' || !UIVisible ||
        Elements.hairPicker.open || KeyEvent.ctrlKey || KeyEvent.altKey || KeyEvent.metaKey ||
        !['ArrowLeft', 'ArrowRight'].includes(KeyEvent.key) ||
        (KeyEvent.target !== Slider && KeyEvent.target.closest?.('input:not([type=range]), textarea, select, [contenteditable=true]'))) return
    KeyEvent.preventDefault()
    const Previous = Slider.value
    if (KeyEvent.key === 'ArrowRight') Slider.stepUp()
    else Slider.stepDown()
    if (Slider.value !== Previous) {
      Slider.dispatchEvent(new Event('input', { bubbles: true }))
      Slider.dispatchEvent(new Event('change', { bubbles: true }))
    }
  })
  Elements.hairStep.oninput = () => {
    const Index = Number(Elements.hairStep.value)
    if (Elements.hairStep.disabled || Index === Elements.hairStyle.selectedIndex) return
    Elements.hairStyle.selectedIndex = Index
    RenderHairChoice()
    // Длинное перетаскивание не должно пересобирать модель на каждом промежуточном шаге.
    ScheduleLookTryOn()
  }
  Elements.hairStep.onchange = FlushHairSlider
  Elements.openHairPicker.onclick = () => {
    if (!Appearance?.available) return
    FlushHairSlider()
    TryHairOnClose = false
    Elements.hairPicker.showModal()
    Elements.hairSearch.value = ''
    RenderHairGrid()
    Elements.hairSearch.focus()
  }
  Elements.closeHairPicker.onclick = () => Elements.hairPicker.close()
  Elements.hairPicker.addEventListener('close', () => {
    StopHairShots()
    QueueLookFrame(TryHairOnClose)
    TryHairOnClose = false
  })
  Elements.hairSearch.oninput = RenderHairGrid
}
