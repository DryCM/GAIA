"""
conejo_blender.py
-----------------
Importa un FBX de conejo, aplica clips de animacion por mood
(Idle / Listen / Think / Speak / Happy) sobre el objeto raiz y
exporta un GLB listo para la app.

Uso (Blender headless):
    blender --background --python assets/mascots/conejo_blender.py

Configuracion rapida:
    FBX_FILE    -> ruta absoluta o relativa al .fbx del conejo
    OUTPUT_FILE -> "bunny.glb" (defecto) o "panda.glb" para test rapido
    FPS         -> fotogramas por segundo del proyecto (defecto 24)
"""

import bpy
import os
import math

# ──────────────────────────────────────────────────────────
# CONFIGURACION
# ──────────────────────────────────────────────────────────
FBX_FILE    = r"C:\Users\Jaime\Desktop\blend\bunny_blend.fbx"
OUTPUT_FILE = "panda.glb"    # "panda.glb" para test rapido en la app
FPS         = 24             # fotogramas por segundo
LOOP_FRAMES = 48             # duracion de cada clip (2 s a 24 fps)
# ──────────────────────────────────────────────────────────

script_dir  = os.path.dirname(os.path.abspath(__file__))
output_path = os.path.join(script_dir, OUTPUT_FILE)

if not os.path.exists(FBX_FILE):
    raise FileNotFoundError(f"No se encontro el FBX: {FBX_FILE}")

# ── Limpiar escena actual ──────────────────────────────────
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for col in (bpy.data.meshes, bpy.data.materials,
            bpy.data.armatures, bpy.data.actions):
    for block in list(col):
        col.remove(block)

# ── Importar FBX ──────────────────────────────────────────
print(f"Importando {FBX_FILE} ...")
bpy.ops.import_scene.fbx(filepath=FBX_FILE)

scene = bpy.context.scene
scene.render.fps = FPS
scene.frame_start = 1
scene.frame_end = LOOP_FRAMES

linked = list(bpy.context.selected_objects)
if not linked:
    linked = list(scene.objects)

if not linked:
    raise RuntimeError("El FBX no contenia objetos. Revisa el archivo.")

print(f"  {len(linked)} objetos importados: {[o.name for o in linked]}")

print(f"  {len(linked)} objetos importados: {[o.name for o in linked]}")

# ── Encontrar o crear objeto raiz ──────────────────────────
armatures = [o for o in linked if o.type == "ARMATURE"]
top_level  = [o for o in linked if o.parent is None]

if armatures:
    root = armatures[0]
    print(f"  Armature encontrada: {root.name}")
else:
    # Si no hay armature, buscamos el padre mas alto del grupo de meshes
    if len(top_level) == 1:
        root = top_level[0]
    else:
        # Varios objetos sin padre -> crear un empty y emparejarlos a el
        bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0))
        root = bpy.context.active_object
        root.name = "BunnyRoot"
        for obj in top_level:
            obj.parent = root
    print(f"  Usando como raiz: {root.name}")

# Suavizar sombreado en meshes
for obj in linked:
    if obj.type == "MESH":
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.shade_smooth()

# ── Definicion de animaciones ──────────────────────────────
# Formato: (frame, delta_loc_xyz, rot_euler_xyz_radians)
# El primer y ultimo keyframe deben coincidir para que el loop sea limpio.

ANIMATIONS = {
    # Respiracion suave + ligero balanceo
    "Idle": [
        (1,  (0,    0,    0   ), (0,     0,      0    )),
        (24, (0,    0,    0.06), (0.015, 0.04,   0    )),
        (LOOP_FRAMES, (0, 0, 0), (0,     0,      0    )),
    ],

    # Orejas adelante, leve inclinacion de cabeza a un lado
    "Listen": [
        (1,  (0,    0,    0   ), (0,     0,     0    )),
        (12, (0,    0,    0.03), (0.07,  0,     0.05 )),
        (24, (0.02, 0,    0.04), (-0.03, 0,     0.05 )),
        (36, (0,    0,    0.03), (0.07,  0,     0.05 )),
        (LOOP_FRAMES, (0, 0, 0), (0,     0,     0    )),
    ],

    # Cabeza girada lateral, pausa reflexiva
    "Think": [
        (1,  (0, 0, 0), (0,     0,     0    )),
        (16, (0, 0, 0), (0.12,  0,     0.15 )),
        (32, (0, 0, 0), (0.12,  0,     0.15 )),
        (LOOP_FRAMES, (0, 0, 0), (0,    0,   0    )),
    ],

    # Cabeceos rapidos simulando discurso
    "Speak": [
        (1,  (0,    0,    0   ), (0,     0,     0    )),
        (8,  (0,    0,    0.07), (0.07,  0,     0    )),
        (16, (0,    0,    0   ), (0,     0,     0    )),
        (24, (0,    0,    0.07), (-0.04, 0,     0.04 )),
        (32, (0,    0,    0   ), (0,     0,     0    )),
        (40, (0,    0,    0.07), (0.07,  0,    -0.04 )),
        (LOOP_FRAMES, (0, 0, 0), (0,     0,     0    )),
    ],

    # Saltitos de alegria
    "Happy": [
        (1,  (0, 0, 0   ), (0,      0,    0    )),
        (10, (0, 0, 0.28), (0.05,   0,    0.1  )),
        (20, (0, 0, 0   ), (0,      0,    0    )),
        (30, (0, 0, 0.22), (-0.05,  0,   -0.1  )),
        (40, (0, 0, 0   ), (0,      0,    0    )),
        (LOOP_FRAMES, (0, 0, 0.1), (0,    0,   0    )),
    ],
}

# ── Helpers para compatibilidad Blender 4.x / 5.x ─────────
def iter_fcurves(action):
    """Itera sobre las FCurves de una accion compatible con Blender 4 y 5."""
    # Blender <= 4.x: action.fcurves existe directamente
    if hasattr(action, "fcurves"):
        yield from action.fcurves
        return
    # Blender 5.x: layers -> strips -> channelbags -> fcurves
    if hasattr(action, "layers"):
        for layer in action.layers:
            for strip in layer.strips:
                if hasattr(strip, "channelbags"):
                    for cb in strip.channelbags:
                        yield from cb.fcurves


def get_or_create_slot(action, obj):
    """Devuelve (o crea) el slot de accion para el objeto (Blender 5.x)."""
    if not hasattr(action, "slots"):
        return None          # Blender 4.x: no se usa
    for slot in action.slots:
        if slot.name == obj.name:
            return slot
    return action.slots.new(id_type="OBJECT", name=obj.name)


# ── Crear acciones y empujar a NLA ────────────────────────
def build_action(obj, action_name, keyframes):
    """Crea una accion Blender con keyframes sobre obj y la devuelve."""
    base_loc = obj.location.copy()
    base_rot = obj.rotation_euler.copy()

    action = bpy.data.actions.new(name=action_name)
    obj.animation_data_create()

    # Blender 5.x requiere asignar un slot antes de insertar keyframes
    slot = get_or_create_slot(action, obj)
    if slot is not None:
        obj.animation_data.action        = action
        obj.animation_data.action_slot   = slot
    else:
        obj.animation_data.action = action

    for (frame, dloc, rot) in keyframes:
        obj.location = (
            base_loc.x + dloc[0],
            base_loc.y + dloc[1],
            base_loc.z + dloc[2],
        )
        obj.rotation_euler = (
            base_rot.x + rot[0],
            base_rot.y + rot[1],
            base_rot.z + rot[2],
        )
        obj.keyframe_insert(data_path="location",       frame=frame)
        obj.keyframe_insert(data_path="rotation_euler", frame=frame)

    # Interpolacion sinusoidal para movimiento organico
    for fcurve in iter_fcurves(action):
        for kp in fcurve.keyframe_points:
            kp.interpolation = "SINE"

    # Restaurar posicion base
    obj.location       = base_loc
    obj.rotation_euler = base_rot
    return action


# Limpiar animacion previa del root si la hubiera
root.animation_data_clear()
root.animation_data_create()

built_actions = {}
for aname, keys in ANIMATIONS.items():
    act = build_action(root, aname, keys)
    built_actions[aname] = act
    print(f"  Accion '{aname}' creada ({len(keys)} keyframes)")

# Desactivar accion directa; las NLA strips se exportan al GLB
root.animation_data.action = None

# Crear NLA tracks (una por mood)
for aname, act in built_actions.items():
    track = root.animation_data.nla_tracks.new()
    track.name = aname
    strip = track.strips.new(aname, start=1, action=act)
    strip.action_frame_start = 1
    strip.action_frame_end   = LOOP_FRAMES
    strip.use_cyclic = True

# ── Exportar GLB ──────────────────────────────────────────
print(f"\nExportando -> {output_path}")
bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format="GLB",
    export_apply=True,
    export_animations=True,
    export_nla_strips=True,
    export_nla_strips_merged_animation_name="",
)
print(f"Listo. '{OUTPUT_FILE}' generado en {script_dir}")
