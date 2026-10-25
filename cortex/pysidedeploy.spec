[app]
title = IPScans Cortex
project_dir = .
input_file = cortex_desktop.py
project_file =
exec_directory = ./dist

[python]
python_path =
packages = Nuitka==2.6.8

[qt]
qml_files = qml/Theme.qml,qml/Main.qml,qml/CortexLogo3D.qml,qml/CortexCore3DView.qml,qml/CortexStartup3D.qml
excluded_qml_plugins =
modules = Core,Gui,Qml,Quick,QuickControls2,Quick3D
plugins = platforms,scenegraph, renderers,generic,imageformats

[nuitka]
mode = standalone
extra_args = --quiet --noinclude-qt-translations --windows-console-mode=disable --include-data-dir=qml=qml --include-data-dir=ui=ui --include-data-dir=admin_ui=admin_ui
