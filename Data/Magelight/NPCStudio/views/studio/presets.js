// Редактор хранит черновик отдельно от выбранного набора и инвентаря NPC.
let PresetDraft = null
let DraftSelection = null
const PresetContents = document.createElement('div')
PresetContents.className = 'preset-items'
Elements.presetDescription.after(PresetContents)
const CreationContents = document.createElement('div')
CreationContents.className = 'preset-items'
Elements.creationPresetInfo.after(CreationContents)
const EditorContents = document.createElement('div')
EditorContents.className = 'preset-items'
Elements.savePreset.before(EditorContents)
const EditorActions = document.createElement('div')
EditorActions.className = 'button-row'
Elements.presetName.closest('.form-grid').before(EditorActions)
function PresetButton(Label, Handler) {
  const Button = document.createElement('button')
  const Text = document.createTextNode(T(Label))
  StaticText.push([Text, Label])
  Button.append(Text)
  Button.onclick = Handler
  return Button
}
const NewPreset = PresetButton('Новый набор', () => BeginDraft(null))
const CopyPreset = PresetButton('Создать копию', () => BeginDraft(State.library.presets.find(P => P.id === Elements.equipmentPreset.value), true))
EditorActions.append(NewPreset, CopyPreset)
const EditorSearch = document.createElement('input')
EditorSearch.type = 'search'
EditorSearch.id = 'presetItemSearch'
EditorSearch.maxLength = 80
const SearchResults = document.createElement('div')
SearchResults.className = 'preset-items'
const SearchButton = PresetButton('Найти', async () => {
  SearchButton.disabled = true
  try {
    const Result = await Send('presetCatalog', { query: EditorSearch.value, kind: 'all' }, true)
    SearchResults.replaceChildren(...Result.catalog.map(Item => {
      const Row = ItemRow(Item)
      Row.append(PresetButton('Добавить', () => {
        if (!PresetDraft || PresetDraft.items.length >= 64) return
        const Existing = PresetDraft.items.find(I => I.plugin === Item.plugin && I.form === Item.form)
        if (Existing) Existing.count = Math.min(1000, Existing.count + 1)
        else PresetDraft.items.push({ ...Item, count: 1 })
        RenderDraft()
      }))
      return Row
    }))
  } catch (Error) { Message(Error.message, true) }
  finally { SearchButton.disabled = false }
})
EditorSearch.onkeydown = Event => { if (Event.key === 'Enter') SearchButton.click() }
const SearchBar = document.createElement('div')
SearchBar.className = 'preset-search-bar'
SearchBar.append(EditorSearch, SearchButton)
Elements.savePreset.after(SearchBar, SearchResults)
function ItemRow(Item) {
  const Row = document.createElement('div')
  Row.className = 'preset-item-row'
  const Name = document.createElement('span')
  Name.textContent = (Item.name || Item.plugin + ' | ' + Item.form) + ' × ' + Item.count
  Row.append(ItemIcon(Item), Name)
  return Row
}
function BeginDraft(Preset, Copy = false) {
  PresetDraft = Preset && (!Preset.custom && !Copy) ? null : {
    preset: Copy ? '' : Preset?.id || '',
    items: structuredClone(Preset?.items || [])
  }
  Elements.presetName.value = Preset ? Preset.name + (Copy ? ' — ' + T('Копия') : '') : ''
  Elements.saveCategory.value = Copy || !Preset ? 'Мои наборы' : Preset.category
  Elements.saveCategory.dispatchEvent(new Event('change'))
  SearchResults.replaceChildren()
  RenderDraft()
}
function RenderDraft() {
  EditorContents.replaceChildren(...(PresetDraft?.items || []).map((Item, Index) => {
    const Row = ItemRow(Item)
    const Count = document.createElement('input')
    Count.type = 'number'; Count.min = '1'; Count.max = '1000'; Count.value = Item.count
    Count.onchange = () => { Item.count = Math.max(1, Math.min(1000, Number(Count.value) || 1)); Count.value = Item.count }
    Row.append(Count, PresetButton('Удалить', () => { PresetDraft.items.splice(Index, 1); RenderDraft() }))
    return Row
  }))
  NewPreset.disabled = CopyPreset.disabled = MutationBusy
  Elements.presetName.disabled = !PresetDraft || MutationBusy
  Elements.saveCategory.disabled = !PresetDraft || MutationBusy
  RefreshCombo(Elements.saveCategory)
  Elements.savePreset.disabled = !PresetDraft?.items.length || MutationBusy
  EditorSearch.disabled = SearchButton.disabled = !PresetDraft || MutationBusy
}
Elements.savePreset.onclick = async () => {
  if (!PresetDraft?.items.length || MutationBusy) return
  MutationBusy = true
  RenderDraft()
  try {
    const Name = Elements.presetName.value.trim()
    const Category = Elements.saveCategory.value
    const DraftId = PresetDraft.preset
    const PreviousIds = new Set(State.library.presets.map(P => P.id))
    const Result = await Send('editPreset', { ...PresetDraft, name: Name, category: Category })
    const Saved = Result.library.presets.find(P => DraftId ? P.id === DraftId : !PreviousIds.has(P.id))
    if (Saved) {
      Elements.presetCategory.value = Saved.category
      RenderLibrary()
      Elements.equipmentPreset.value = Saved.id
      DraftSelection = null
      RenderLibrary()
    }
    Message(T('Набор сохранён'))
  } catch (Error) { Message(Error.message, true) }
  finally { MutationBusy = false; RenderLibrary() }
}
const BaseRenderLibrary = RenderLibrary
RenderLibrary = function() {
  BaseRenderLibrary()
  const Selected = State.library.presets.find(P => P.id === Elements.equipmentPreset.value)
  PresetContents.replaceChildren(...(Selected?.items || []).map(ItemRow))
  const DeletePreset = document.querySelector('[data-library-delete="deletePreset"]')
  const DeleteCategory = document.querySelector('[data-library-delete="deleteCategory"]')
  if (DeletePreset) DeletePreset.disabled = !Selected?.custom || MutationBusy
  const Category = Elements.presetCategory.value
  if (DeleteCategory) DeleteCategory.disabled = !Category || Category === 'Мои наборы' || MutationBusy || State.library.presets.some(P => P.category === Category)
  if (DraftSelection !== Selected?.id) {
    DraftSelection = Selected?.id
    BeginDraft(Selected)
  }
  RenderDraft()
}
const BaseRenderCreation = RenderCreation
RenderCreation = function() {
  BaseRenderCreation()
  const Preset = State.library.presets.find(P => P.id === Elements.creationPreset.value)
  CreationContents.replaceChildren(...(Preset?.items || []).map(ItemRow))
}
// Magelight перехватывает клавиатуру в UI, поэтому закрытие обрабатываем также здесь.
let MenuOpenedAt = performance.now()

document.addEventListener('keydown', Event => {
  if (!UIVisible || Event.repeat || performance.now() - MenuOpenedAt < 250) return
  const Label = Event.code.replace(/^(Digit|Key)/, '')
  const Key = KeyOptions.find(Option => Option.label === Label)
  const Modifiers = (Event.shiftKey ? 1 : 0) | (Event.ctrlKey ? 2 : 0) | (Event.altKey ? 4 : 0)
  if (Key?.value === State?.settings?.key && Modifiers === State.settings.modifiers) {
    Event.preventDefault()
    Event.stopPropagation()
    Elements.close.click()
  }
}, true)
