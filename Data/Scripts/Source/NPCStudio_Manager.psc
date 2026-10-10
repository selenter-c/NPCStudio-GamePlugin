ScriptName NPCStudio_Manager extends Quest

String Property PluginVersion = "0.1.0" AutoReadOnly
String Property PluginAuthor = "Selenter" AutoReadOnly

Event OnInit()
    Debug.Notification("NPC Studio v" + PluginVersion + " загружен (автор: " + PluginAuthor + ")")
    Debug.Trace("NPC Studio: OnInit — мод активен")
    Debug.Trace("NPC Studio: версия " + PluginVersion)
    Debug.Trace("NPC Studio: автор " + PluginAuthor)
    Debug.Trace("NPC Studio: целевая игра Skyrim SE 1.6.1170")
EndEvent

Function Maintenance()
    Debug.Trace("NPC Studio: Maintenance вызван")
EndFunction