"""
leon_blender.py
---------------
ES: Crea un León 3D estilo cartoon/chibi para GaIA (mascota infantil).
    Incluye armadura completa con jerarquía de huesos, materiales PBR
    y 5 clips de animación NLA exportados en un único GLB.
EN: Creates a cartoon/chibi-style 3D Lion for GaIA (children's mascot).
    Includes a full armature with bone hierarchy, PBR materials
    and 5 NLA animation clips exported in a single GLB.

Animaciones / Animations:
  Idle    – respiración + cola osciante  / breathing + swaying tail
  Listen  – cabeza ladeada + oreja arriba / head tilt + ear up
  Think   – cabeza baja, pausa, sube     / head down, pause, rises
  Speak   – pulso rítmico en cuerpo/cabeza / rhythmic body/head pulse
  Happy   – salto + melena exagerada     / jump + exaggerated mane

Uso / Usage (Blender headless):
    blender --background --python assets/mascots/leon_blender.py
"""

import bpy
import math
import os

# ── Configuración / Configuration ─────────────────────────────────
OUTPUT_FILE  = "leon.glb"   # ES: archivo de salida / EN: output file
FPS          = 24           # ES: fotogramas por segundo / EN: frames per second
CLIP_FRAMES  = 48           # ES: duración de cada clip (2 s) / EN: each clip length (2 s)
# ──────────────────────────────────────────────────────────────────

script_dir  = os.path.dirname(os.path.abspath(__file__))
output_path = os.path.join(script_dir, OUTPUT_FILE)

# ── 1. Limpiar escena / Clear scene ───────────────────────────────
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for col in (bpy.data.meshes, bpy.data.materials,
            bpy.data.armatures, bpy.data.actions,
            bpy.data.curves):
    for blk in list(col):
        blk.user_clear()
        try: col.remove(blk)
        except: pass

# ── 2. Materiales PBR / PBR Materials ─────────────────────────────
def make_mat(name, color_rgb, roughness=0.75, metallic=0.0, subsurface=0.05):
    """
    ES: Crea un material Principled BSDF con parámetros básicos de PBR.
    EN: Creates a Principled BSDF material with basic PBR parameters.
    """
    m = bpy.data.materials.new(name=name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value      = (*color_rgb, 1.0)
    bsdf.inputs["Roughness"].default_value       = roughness
    bsdf.inputs["Metallic"].default_value        = metallic
    # ES: Subsurface da aspecto de piel suave / EN: Subsurface gives soft-skin look
    try:
        bsdf.inputs["Subsurface Weight"].default_value = subsurface  # Blender 4.x
    except KeyError:
        bsdf.inputs["Subsurface"].default_value = subsurface          # Blender 3.x
    return m

# ES: Paleta de colores del León / EN: Lion colour palette
MAT_CUERPO      = make_mat("Leon_Cuerpo",   (0.90, 0.68, 0.30), roughness=0.80, subsurface=0.10)
MAT_CUERPO_OSC  = make_mat("Leon_Oscuro",   (0.78, 0.52, 0.20), roughness=0.82, subsurface=0.08)
MAT_MELENA      = make_mat("Leon_Melena",   (0.40, 0.18, 0.04), roughness=0.92, subsurface=0.06)
MAT_MELENA_OSC  = make_mat("Leon_MelenaOsc",(0.28, 0.10, 0.01), roughness=0.95, subsurface=0.04)
MAT_HOCICO      = make_mat("Leon_Hocico",   (0.96, 0.84, 0.65), roughness=0.72, subsurface=0.12)
MAT_NARIZ       = make_mat("Leon_Nariz",    (0.62, 0.22, 0.22), roughness=0.52)
MAT_OJO_BLANCO  = make_mat("Leon_OjoBlanco",(0.96, 0.96, 0.96), roughness=0.10)
MAT_IRIS        = make_mat("Leon_Iris",     (0.25, 0.72, 0.22), roughness=0.06)
MAT_PUPILA      = make_mat("Leon_Pupila",   (0.02, 0.02, 0.02), roughness=0.04)
MAT_BRILLO      = make_mat("Leon_Brillo",   (0.99, 0.99, 0.99), roughness=0.01)
MAT_GARRA       = make_mat("Leon_Garra",    (0.90, 0.82, 0.62), roughness=0.42)
MAT_COLA        = make_mat("Leon_Cola",     (0.88, 0.66, 0.28), roughness=0.84)
MAT_COLA_TUFT   = make_mat("Leon_ColaTuft", (0.40, 0.18, 0.04), roughness=0.92)
MAT_ROSA        = make_mat("Leon_Mejilla",  (1.00, 0.72, 0.72), roughness=0.70, subsurface=0.22)
MAT_PELO_CLARO  = make_mat("Leon_PeloClaro",(0.96, 0.82, 0.52), roughness=0.90, subsurface=0.08)

# ── 3. Utilidades de geometría / Geometry helpers ─────────────────
mesh_parts = []   # ES: lista de todas las piezas creadas / EN: list of all created parts

def _add(obj):
    """ES: Registra y devuelve el objeto. / EN: Registers and returns the object."""
    bpy.ops.object.shade_smooth()
    mesh_parts.append(obj)
    return obj

def mk_sphere(name, r, loc, mat, scale=(1,1,1), subdiv=2, segs=24, rings=16):
    """ES: Esfera UV con subdivisión y material. / EN: UV sphere with subdivision and material."""
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=r, location=loc, segments=segs, ring_count=rings)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    o.data.materials.append(mat)
    m = o.modifiers.new("Sub", "SUBSURF")
    m.levels = subdiv; m.render_levels = 3
    return _add(o)

def mk_cylinder(name, r, depth, loc, mat, rot=(0,0,0), verts=16):
    """ES: Cilindro con material. / EN: Cylinder with material."""
    bpy.ops.mesh.primitive_cylinder_add(
        radius=r, depth=depth, location=loc, vertices=verts)
    o = bpy.context.active_object
    o.name = name
    o.rotation_euler = rot
    o.data.materials.append(mat)
    return _add(o)

def mk_cone(name, r1, r2, depth, loc, mat, rot=(0,0,0)):
    """ES: Cono con material. / EN: Cone with material."""
    bpy.ops.mesh.primitive_cone_add(
        radius1=r1, radius2=r2, depth=depth, location=loc, vertices=16)
    o = bpy.context.active_object
    o.name = name
    o.rotation_euler = rot
    o.data.materials.append(mat)
    return _add(o)

def mk_torus(name, major_r, minor_r, loc, mat, rot=(0,0,0)):
    """ES: Toro con material. / EN: Torus with material."""
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_r, minor_radius=minor_r,
        major_segments=32, minor_segments=12, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.rotation_euler = rot
    o.data.materials.append(mat)
    return _add(o)

# ── 4. Geometría del León / Lion Geometry ─────────────────────────

# ES: CUERPO rechoncho chibi / EN: Chibi chubby body
mk_sphere("Leon_Cuerpo",    1.15, (0,  0.00, 1.15), MAT_CUERPO,    scale=(1.0, 0.80, 0.97))
mk_sphere("Leon_Pecho",     0.80, (0, -0.55, 1.00), MAT_HOCICO,    scale=(0.82, 0.60, 0.74))

# ES: PELAJE del cuerpo — mechones alrededor del torso
# EN: BODY FUR — tufts around the torso
leon_fur = [
    ( 0.92,  0.35, 1.38), (-0.92,  0.35, 1.38),
    ( 0.78, -0.30, 1.60), (-0.78, -0.30, 1.60),
    ( 0.58,  0.70, 0.90), (-0.58,  0.70, 0.90),
    ( 0.00,  0.78, 1.44), ( 0.00, -0.70, 1.60),
]
for i, pos in enumerate(leon_fur):
    mk_sphere(f"Leon_Pelo_{i}", 0.20, pos, MAT_PELO_CLARO, scale=(1.4, 0.50, 0.85))

# ES: CABEZA — chibi (grande vs cuerpo)
# EN: HEAD  — chibi (big vs body)
mk_sphere("Leon_Cabeza",    0.92, (0, -0.38, 2.42), MAT_CUERPO,    scale=(1.06, 0.93, 0.99))

# ES: MELENA — 3 capas para aspecto esponjoso y cute
#     toro exterior + esfera base + mechones sueltos alrededor
# EN: MANE  — 3 layers for a fluffy cute look
#     outer torus + base sphere + loose tufts around
mk_torus("Leon_Melena1",    0.92, 0.52, (0, -0.20, 2.40), MAT_MELENA, rot=(math.pi/2, 0, 0))
mk_sphere("Leon_MelenaBase",1.12, (0, -0.06, 2.24), MAT_MELENA,    scale=(1.10, 0.60, 0.86))
# ES: Mechones de melena sueltos (pelo) / EN: Loose mane tufts (fur)
mane_tufts = [
    ( 0.95, -0.05, 2.55), (-0.95, -0.05, 2.55),
    ( 0.82,  0.25, 2.20), (-0.82,  0.25, 2.20),
    ( 0.70, -0.10, 1.95), (-0.70, -0.10, 1.95),
    ( 0.00, -0.08, 2.82), ( 0.00,  0.38, 2.10),
]
for i, pos in enumerate(mane_tufts):
    mk_sphere(f"Leon_ManaTuft_{i}", 0.24, pos, MAT_MELENA_OSC, scale=(1.0, 0.48, 0.88))

# ES: HOCICO / EN: SNOUT
mk_sphere("Leon_Hocico",    0.42, (0, -1.22, 2.28), MAT_HOCICO,    scale=(1.0, 0.76, 0.68))
mk_sphere("Leon_Nariz",     0.10, (0, -1.58, 2.38), MAT_NARIZ,     scale=(1.2, 0.52, 0.72))

# ES: MEJILLAS ROSADAS (kawaii) / EN: PINK CHEEKS (kawaii)
for side, ex in (("R", 0.46), ("L", -0.46)):
    mk_sphere(f"Leon_Mejilla_{side}", 0.18, (ex, -1.08, 2.30), MAT_ROSA, scale=(1.2, 0.38, 0.88))

# ES: OJOS lindos con brillo / EN: Cute eyes with highlight
for side, ex in (("R", 0.34), ("L", -0.34)):
    mk_sphere(f"Leon_OjoBlanco_{side}", 0.152, (ex, -1.24, 2.56), MAT_OJO_BLANCO, scale=(1.0, 0.44, 1.0))
    mk_sphere(f"Leon_Iris_{side}",      0.118, (ex, -1.33, 2.56), MAT_IRIS,       scale=(1.0, 0.30, 1.0))
    mk_sphere(f"Leon_Pupila_{side}",    0.072, (ex, -1.38, 2.56), MAT_PUPILA,     scale=(0.5, 0.18, 1.1))
    mk_sphere(f"Leon_Brillo_{side}",    0.028, (ex+0.04, -1.39, 2.62), MAT_BRILLO)

# ES: OREJAS con pelo interior / EN: EARS with inner fur
for side, ex in (("R", 0.64), ("L", -0.64)):
    mk_sphere(f"Leon_OrejaExt_{side}", 0.24, (ex, -0.18, 2.96), MAT_CUERPO,   scale=(0.84, 0.56, 1.06))
    mk_sphere(f"Leon_OrejaInt_{side}", 0.15, (ex, -0.24, 2.96), MAT_HOCICO,   scale=(0.62, 0.36, 0.86))
    mk_sphere(f"Leon_OrejaFur_{side}", 0.12, (ex*1.10, -0.12, 3.08), MAT_MELENA, scale=(0.70, 0.40, 0.72))

# ES: PATAS DELANTERAS con pelaje en el hombro y pata
# EN: FRONT LEGS with fur on shoulder and paw
for side, lx, ry in (("RD", 0.58,  0.28), ("LD", -0.58, -0.28)):
    mk_sphere(f"Leon_HombroFur_{side}", 0.22, (lx*0.82, -0.12, 1.05), MAT_PELO_CLARO, scale=(1.0, 0.55, 0.80))
    mk_cylinder(f"Leon_MusloD_{side}",   0.27, 0.70, (lx, -0.22, 0.76), MAT_CUERPO,    rot=(0.32, 0, ry))
    mk_cylinder(f"Leon_TibiaD_{side}",   0.22, 0.60, (lx, -0.36, 0.22), MAT_CUERPO_OSC, rot=(0.12, 0, ry*0.4))
    mk_sphere(  f"Leon_PataD_{side}",    0.24, (lx, -0.47, -0.12), MAT_CUERPO,    scale=(1.15, 1.38, 0.65))
    mk_sphere(  f"Leon_PataFur_{side}",  0.18, (lx, -0.38, -0.05), MAT_PELO_CLARO, scale=(1.30, 0.48, 0.72))
    for gi, gof in enumerate((-0.09, 0.0, 0.09)):
        mk_cone(f"Leon_GarraD_{side}_{gi}", 0.038, 0.008, 0.12,
                (lx + gof, -0.62, -0.21), MAT_GARRA, rot=(0.18, 0, 0))

# ES: PATAS TRASERAS con pelaje / EN: BACK LEGS with fur
for side, lx, ry in (("RT", 0.52,  0.22), ("LT", -0.52, -0.22)):
    mk_cylinder(f"Leon_MusloT_{side}",   0.28, 0.72, (lx, 0.52, 0.78), MAT_CUERPO,    rot=(-0.35, 0, ry))
    mk_cylinder(f"Leon_TibiaT_{side}",   0.22, 0.60, (lx, 0.70, 0.22), MAT_CUERPO_OSC, rot=(-0.14, 0, ry*0.4))
    mk_sphere(  f"Leon_PataT_{side}",    0.24, (lx,  0.86, -0.10), MAT_CUERPO,    scale=(1.05, 1.50, 0.60))
    mk_sphere(  f"Leon_PataFurT_{side}", 0.18, (lx,  0.75, -0.02), MAT_PELO_CLARO, scale=(1.25, 0.45, 0.70))
    for gi, gof in enumerate((-0.09, 0.0, 0.09)):
        mk_cone(f"Leon_GarraT_{side}_{gi}", 0.038, 0.008, 0.12,
                (lx + gof, 1.02, -0.18), MAT_GARRA, rot=(-0.18, 0, 0))

# ES: COLA con pelaje y mechón esponjoso al final
# EN: TAIL with fur and fluffy tuft at the end
mk_cylinder("Leon_Cola1",    0.12, 0.90, (0,  0.95, 1.22), MAT_COLA,      rot=(-0.65, 0, 0))
mk_cylinder("Leon_Cola2",    0.09, 0.60, (0,  1.28, 0.84), MAT_COLA,      rot=(-0.45, 0, 0))
mk_sphere(  "Leon_ColaTuft", 0.28, (0,  1.52, 0.58), MAT_COLA_TUFT, scale=(0.90, 1.18, 0.90))
# ES: Mechones del tuft de cola / EN: Tail tuft fur strands
for i, (tx, tz) in enumerate(((0.12, 0.02),(-0.12, 0.02),(0.00, 0.14),(0.00,-0.08))):
    mk_sphere(f"Leon_ColaTuftFur_{i}", 0.14, (tx, 1.60, 0.52+tz), MAT_MELENA_OSC, scale=(0.7, 1.1, 0.7))

# ── 5. Armadura / Armature ────────────────────────────────────────
bpy.ops.object.select_all(action="DESELECT")
bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
arm_obj      = bpy.context.active_object
arm_obj.name = "Leon_Armature"
arm          = arm_obj.data
arm.name     = "Leon_Arm"

# ES: Eliminar hueso por defecto / EN: Delete default bone
for b in list(arm.edit_bones):
    arm.edit_bones.remove(b)

def add_bone(name, head, tail, parent=None):
    """
    ES: Añade un hueso a la armadura en modo edición.
    EN: Adds a bone to the armature in edit mode.
    """
    b = arm.edit_bones.new(name)
    b.head = head
    b.tail = tail
    if parent:
        b.parent = arm.edit_bones[parent]
        b.use_connect = False
    return b

# ES: Jerarquía de huesos / EN: Bone hierarchy
# Root → Body → Chest
#              → Head → ManeCtrl → EarR / EarL
#              → TailBase → TailMid → TailTip
#              → FrontLegR → FrontLowerR
#              → FrontLegL → FrontLowerL
#              → BackLegR  → BackLowerR
#              → BackLegL  → BackLowerL
add_bone("Root",        (0,  0.00, 0.00), (0,  0.00, 0.30))
add_bone("Body",        (0,  0.00, 0.90), (0,  0.00, 1.65), "Root")
add_bone("Chest",       (0, -0.30, 0.95), (0, -0.30, 1.35), "Body")
add_bone("Head",        (0, -0.25, 1.85), (0, -0.50, 2.55), "Body")
add_bone("ManeCtrl",    (0, -0.15, 2.05), (0, -0.15, 2.65), "Head")
add_bone("EarR",        ( 0.62, -0.18, 2.60), ( 0.62, -0.18, 2.98), "Head")
add_bone("EarL",        (-0.62, -0.18, 2.60), (-0.62, -0.18, 2.98), "Head")
add_bone("TailBase",    (0,  0.82, 1.25), (0,  1.05, 1.02), "Body")
add_bone("TailMid",     (0,  1.05, 1.02), (0,  1.32, 0.80), "TailBase")
add_bone("TailTip",     (0,  1.32, 0.80), (0,  1.52, 0.55), "TailMid")
add_bone("FrontLegR",   ( 0.57, -0.20, 0.95), ( 0.57, -0.38, 0.42), "Body")
add_bone("FrontLowerR", ( 0.57, -0.38, 0.42), ( 0.57, -0.50, 0.00), "FrontLegR")
add_bone("FrontLegL",   (-0.57, -0.20, 0.95), (-0.57, -0.38, 0.42), "Body")
add_bone("FrontLowerL", (-0.57, -0.38, 0.42), (-0.57, -0.50, 0.00), "FrontLegL")
add_bone("BackLegR",    ( 0.52,  0.48, 0.95), ( 0.52,  0.70, 0.42), "Body")
add_bone("BackLowerR",  ( 0.52,  0.70, 0.42), ( 0.52,  0.87,-0.05), "BackLegR")
add_bone("BackLegL",    (-0.52,  0.48, 0.95), (-0.52,  0.70, 0.42), "Body")
add_bone("BackLowerL",  (-0.52,  0.70, 0.42), (-0.52,  0.87,-0.05), "BackLegL")

bpy.ops.object.mode_set(mode="OBJECT")

# ── 6. Parentar mallas a armadura / Parent meshes to armature ─────
# ES: Seleccionamos todas las piezas + armadura y usamos auto-weight.
# EN: We select all parts + armature and use automatic weights.
bpy.ops.object.select_all(action="DESELECT")
for part in mesh_parts:
    part.select_set(True)
arm_obj.select_set(True)
bpy.context.view_layer.objects.active = arm_obj
bpy.ops.object.parent_set(type="ARMATURE_AUTO")

# ── 7. Animaciones / Animations ───────────────────────────────────
bpy.context.view_layer.objects.active = arm_obj
bpy.ops.object.mode_set(mode="POSE")

scene           = bpy.context.scene
scene.render.fps = FPS


def kf_rot(bone_name, euler, frame):
    """
    ES: Inserta un keyframe de rotación en un hueso de pose.
    EN: Inserts a rotation keyframe on a pose bone.
    """
    pb = arm_obj.pose.bones.get(bone_name)
    if pb:
        pb.rotation_mode = "XYZ"
        pb.rotation_euler = euler
        pb.keyframe_insert("rotation_euler", frame=frame)


def kf_loc(bone_name, loc, frame):
    """
    ES: Inserta un keyframe de localización en un hueso de pose.
    EN: Inserts a location keyframe on a pose bone.
    """
    pb = arm_obj.pose.bones.get(bone_name)
    if pb:
        pb.location = loc
        pb.keyframe_insert("location", frame=frame)


def clear_pose():
    """
    ES: Pone todos los huesos en posición de reposo (neutral).
    EN: Sets all pose bones to rest/neutral position.
    """
    for pb in arm_obj.pose.bones:
        pb.rotation_mode  = "XYZ"
        pb.rotation_euler = (0, 0, 0)
        pb.location       = (0, 0, 0)


arm_obj.animation_data_create()
all_actions = {}

# ── IDLE (respiración suave + cola osciante) ──────────────────────
# ES: Clip 1 – el León respira tranquilamente y la cola se balancea.
# EN: Clip 1 – the Lion breathes quietly and the tail sways.
a = bpy.data.actions.new("Idle")
all_actions["Idle"] = a
arm_obj.animation_data.action = a
clear_pose()

# ES: Respiración = Body sube/baja ligeramente
# EN: Breathing = Body rises/falls slightly
for f, z in ((1, 0.000), (12, 0.032), (24, 0.000), (36, 0.032), (48, 0.000)):
    kf_loc("Body", (0, 0, z), f)

# ES: Cola osciante de lado a lado
# EN: Tail swaying side to side
for f, rz in ((1, 0.00), (12, 0.22), (24, 0.00), (36, -0.22), (48, 0.00)):
    kf_rot("TailMid", (0, 0, rz), f)
    kf_rot("TailTip", (0, 0, rz * 1.4), f)

# ES: Melena oscilación suave
# EN: Mane gentle sway
for f, rz in ((1, 0.00), (16, 0.06), (32, -0.06), (48, 0.00)):
    kf_rot("ManeCtrl", (0, 0, rz), f)

# ── LISTEN (cabeza ladeada + oreja levantada) ─────────────────────
# ES: Clip 2 – la cabeza se ladea y la oreja derecha sube, atento.
# EN: Clip 2 – head tilts and right ear rises, attentive.
a = bpy.data.actions.new("Listen")
all_actions["Listen"] = a
arm_obj.animation_data.action = a
clear_pose()

for f, rz, ry in (
    (1, 0.00, 0.00), (10, 0.38, 0.05), (38, 0.38, 0.05), (48, 0.00, 0.00)
):
    kf_rot("Head", (0, ry, rz), f)

# ES: Oreja derecha se levanta hacia atrás al escuchar
# EN: Right ear rotates back when listening
for f, rx in ((1, 0.00), (10, 0.28), (38, 0.28), (48, 0.00)):
    kf_rot("EarR", (rx, 0, 0), f)

# ES: Cola se mueve despacio, curiosa
# EN: Tail moves slowly, curious
for f, rz in ((1, 0.0), (24, 0.18), (48, 0.0)):
    kf_rot("TailMid", (0, 0, rz), f)

# ── THINK (cabeza baja, pausa pensativa, sube) ───────────────────
# ES: Clip 3 – la cabeza baja como pensando, se queda quieta y luego sube.
# EN: Clip 3 – head lowers as if thinking, stays still, then rises.
a = bpy.data.actions.new("Think")
all_actions["Think"] = a
arm_obj.animation_data.action = a
clear_pose()

for f, rx in (
    (1, 0.00), (10, 0.42), (28, 0.42), (40, 0.00), (48, 0.00)
):
    kf_rot("Head", (rx, 0, 0), f)

# ES: Cola cuelga más quieta (pensativo)
# EN: Tail hangs more still (thoughtful)
for f, rz in ((1, 0.00), (14, 0.08), (28, -0.08), (42, 0.08), (48, 0.00)):
    kf_rot("TailTip", (0, 0, rz), f)

# ── SPEAK (pulso rítmico) ─────────────────────────────────────────
# ES: Clip 4 – el cuerpo/cabeza pulsa ligeramente, simulando hablar.
# EN: Clip 4 – body/head pulse slightly, simulating speech.
a = bpy.data.actions.new("Speak")
all_actions["Speak"] = a
arm_obj.animation_data.action = a
clear_pose()

# ES: 6 pulsos en 48 frames = habla animada
# EN: 6 pulses in 48 frames = lively speech
pulse_frames = [1, 8, 16, 24, 32, 40, 48]
for i, f in enumerate(pulse_frames):
    up = 0.028 if i % 2 == 0 else -0.008
    kf_loc("Head", (0, 0, up), f)

# ES: Orejas tiemblan ligeramente con cada sílaba
# EN: Ears tremble slightly with each syllable
for i, f in enumerate(pulse_frames):
    rz = 0.06 if i % 2 == 0 else -0.06
    kf_rot("EarR", (0, 0,  rz), f)
    kf_rot("EarL", (0, 0, -rz), f)

# ── HAPPY (salto + cola eufórica) ─────────────────────────────────
# ES: Clip 5 – salta de alegría y la cola se agita con entusiasmo.
# EN: Clip 5 – jumps with joy and the tail wags enthusiastically.
a = bpy.data.actions.new("Happy")
all_actions["Happy"] = a
arm_obj.animation_data.action = a
clear_pose()

# ES: Salto doble / EN: Double jump
for f, z in (
    (1, 0.00), (8, 0.30), (16, 0.00), (24, 0.18), (32, 0.00), (40, 0.06), (48, 0.00)
):
    kf_loc("Root", (0, 0, z), f)

# ES: Cola muy agitada en cada salto / EN: Tail wags vigorously on each jump
for f, rz in (
    (1, 0.0), (8, 0.6), (16, -0.6), (24, 0.8), (32, -0.8), (40, 0.4), (48, 0.0)
):
    kf_rot("TailMid", (0, 0, rz), f)
    kf_rot("TailTip", (0, 0, rz * 1.5), f)

# ES: Melena se expande en el salto / EN: Mane expands on jump
for f, rx in ((1, 0.0), (8, 0.20), (16, 0.0), (24, 0.20), (48, 0.0)):
    kf_rot("ManeCtrl", (rx, 0, 0), f)

bpy.ops.object.mode_set(mode="OBJECT")

# ── 8. Publicar acciones en pistas NLA / Push actions to NLA ──────
# ES: Cada acción se convierte en una pista NLA independiente.
#     La app Three.js / Babylon.js puede reproducir cada pista por nombre.
# EN: Each action becomes an independent NLA track.
#     The Three.js / Babylon.js app can play each track by name.
arm_obj.animation_data_create()
for name, action in all_actions.items():
    track       = arm_obj.animation_data.nla_tracks.new()
    track.name  = name
    strip       = track.strips.new(name, 1, action)
    strip.action_frame_start = 1
    strip.action_frame_end   = CLIP_FRAMES
    strip.frame_start        = 1
    strip.frame_end          = CLIP_FRAMES

# ES: Desactivar acción directa para que solo queden las pistas NLA
# EN: Deactivate direct action so only NLA tracks remain
arm_obj.animation_data.action = None

# ── 9. Configurar escena y exportar GLB / Setup scene and export ──
scene.frame_start = 1
scene.frame_end   = CLIP_FRAMES

# ES: Seleccionar todo para exportar completo
# EN: Select everything for a complete export
bpy.ops.object.select_all(action="SELECT")

bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format="GLB",
    export_apply=True,           # ES: aplicar modificadores / EN: apply modifiers
    export_animations=True,
    export_nla_strips=True,
    export_anim_mode="NLA_TRACKS",
    export_skins=True,
    export_morph=True,
)

print(f"\n✅ León exportado / Lion exported → {output_path}")
print("   Animaciones NLA / NLA animations: Idle, Listen, Think, Speak, Happy")
