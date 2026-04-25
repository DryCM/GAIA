"""
zorro_blender.py
----------------
ES: Crea un Zorro Fennec 3D estilo cartoon/chibi para GaIA.
    Orejas enormes características del Fennec, hocico puntiagudo,
    cola esponjosa con punta blanca. Armadura completa + 5 clips NLA.
EN: Creates a cartoon/chibi-style Fennec Fox 3D for GaIA.
    Trademark huge Fennec ears, pointed snout, fluffy tail with white tip.
    Full armature + 5 NLA animation clips.

Animaciones / Animations:
  Idle    – respiración + cola esponjosa balanceándose
  Listen  – orejas enormes giran hacia el sonido
  Think   – cabeza ladeada + oreja ladeada pensativa
  Speak   – hocico pulsante + cuerpo animado
  Happy   – saltito + orejas hacia arriba + cola eufórica

Uso / Usage (Blender headless):
    blender --background --python assets/mascots/zorro_blender.py
"""

import bpy
import math
import os

# ── Configuración / Configuration ─────────────────────────────────
OUTPUT_FILE = "zorro.glb"
FPS         = 24
CLIP_FRAMES = 48
# ──────────────────────────────────────────────────────────────────

script_dir  = os.path.dirname(os.path.abspath(__file__))
output_path = os.path.join(script_dir, OUTPUT_FILE)

# ── 1. Limpiar escena / Clear scene ───────────────────────────────
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for col in (bpy.data.meshes, bpy.data.materials,
            bpy.data.armatures, bpy.data.actions):
    for blk in list(col):
        blk.user_clear()
        try: col.remove(blk)
        except: pass

# ── 2. Materiales PBR / PBR Materials ─────────────────────────────
def make_mat(name, color, roughness=0.72, metallic=0.0, subsurface=0.04):
    """
    ES: Crea material Principled BSDF con parámetros PBR básicos.
    EN: Creates Principled BSDF material with basic PBR parameters.
    """
    m = bpy.data.materials.new(name=name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value  = roughness
    bsdf.inputs["Metallic"].default_value   = metallic
    try:
        bsdf.inputs["Subsurface Weight"].default_value = subsurface  # Blender 4.x
    except KeyError:
        bsdf.inputs["Subsurface"].default_value = subsurface          # Blender 3.x
    return m

# ES: Paleta de colores del Zorro Fennec / EN: Fennec Fox colour palette
MAT_NARANJA     = make_mat("Zorro_Naranja",    (0.92, 0.45, 0.10), roughness=0.80, subsurface=0.09)
MAT_NARANJA_OSC = make_mat("Zorro_NaranjaOsc", (0.75, 0.30, 0.05), roughness=0.82, subsurface=0.07)
MAT_BLANCO      = make_mat("Zorro_Blanco",     (0.97, 0.94, 0.90), roughness=0.78, subsurface=0.12)
MAT_NEGRO       = make_mat("Zorro_Negro",      (0.04, 0.04, 0.04), roughness=0.70)
MAT_CREMA       = make_mat("Zorro_Crema",      (0.96, 0.84, 0.68), roughness=0.72, subsurface=0.11)
MAT_NARIZ       = make_mat("Zorro_Nariz",      (0.08, 0.06, 0.06), roughness=0.50)
MAT_IRIS        = make_mat("Zorro_Iris",       (0.62, 0.35, 0.05), roughness=0.06)  # ámbar
MAT_PUPILA      = make_mat("Zorro_Pupila",     (0.02, 0.02, 0.02), roughness=0.04)
MAT_BRILLO      = make_mat("Zorro_Brillo",     (0.99, 0.99, 0.99), roughness=0.01)
MAT_INTERIOR_OR = make_mat("Zorro_OrejaInt",   (0.92, 0.55, 0.45), roughness=0.70, subsurface=0.14)
MAT_COLA_BASE   = make_mat("Zorro_ColaBase",   (0.92, 0.45, 0.10), roughness=0.86, subsurface=0.07)
MAT_COLA_PUNTA  = make_mat("Zorro_ColaPunta",  (0.97, 0.94, 0.90), roughness=0.84, subsurface=0.08)
MAT_ROSA        = make_mat("Zorro_Mejilla",    (1.00, 0.72, 0.72), roughness=0.70, subsurface=0.22)
MAT_PELO_CLR    = make_mat("Zorro_PeloClaro",  (0.98, 0.88, 0.62), roughness=0.90, subsurface=0.08)

# ── 3. Utilidades de geometría / Geometry helpers ─────────────────
mesh_parts = []

def _reg(obj):
    bpy.ops.object.shade_smooth()
    mesh_parts.append(obj)
    return obj

def mk_sphere(name, r, loc, mat, scale=(1,1,1), subdiv=2):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=24, ring_count=16)
    o = bpy.context.active_object
    o.name  = name;  o.scale = scale
    o.data.materials.append(mat)
    mod = o.modifiers.new("Sub", "SUBSURF")
    mod.levels = subdiv; mod.render_levels = 3
    return _reg(o)

def mk_cylinder(name, r, depth, loc, mat, rot=(0,0,0), verts=16):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, vertices=verts)
    o = bpy.context.active_object
    o.name = name;  o.rotation_euler = rot
    o.data.materials.append(mat)
    return _reg(o)

def mk_cone(name, r1, r2, depth, loc, mat, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=depth,
                                    location=loc, vertices=16)
    o = bpy.context.active_object
    o.name = name;  o.rotation_euler = rot
    o.data.materials.append(mat)
    return _reg(o)

# ── 4. Geometría del Zorro / Fox Geometry ─────────────────────────

# ES: CUERPO — esbelto pero con barriga chibi tierna
# EN: BODY  — slim but with a cute chibi belly
mk_sphere("Zorro_Cuerpo",     0.95, (0,  0.00, 0.95), MAT_NARANJA,    scale=(1.0, 0.74, 0.90))
mk_sphere("Zorro_Vientre",    0.68, (0, -0.40, 0.85), MAT_BLANCO,     scale=(0.78, 0.56, 0.70))

# ES: PELAJE del cuerpo — mechones de pelo naranjas
# EN: BODY FUR — orange fur tufts
zorro_fur = [
    ( 0.82,  0.38, 1.12), (-0.82,  0.38, 1.12),
    ( 0.65, -0.28, 1.30), (-0.65, -0.28, 1.30),
    ( 0.00,  0.68, 1.18), ( 0.00, -0.62, 1.32),
    ( 0.48,  0.72, 0.80), (-0.48,  0.72, 0.80),
]
for i, pos in enumerate(zorro_fur):
    mk_sphere(f"Zorro_Pelo_{i}", 0.18, pos, MAT_PELO_CLR, scale=(1.35, 0.48, 0.82))

# ES: CABEZA — triangular y chibi con cabeza grande
# EN: HEAD  — triangular and chibi with big head
mk_sphere("Zorro_Cabeza",     0.82, (0, -0.30, 2.12), MAT_NARANJA,    scale=(1.02, 0.92, 0.96))
mk_sphere("Zorro_CaraBlanca", 0.63, (0, -0.62, 2.10), MAT_CREMA,      scale=(0.80, 0.66, 0.74))

# ES: HOCICO puntiagudo — cono + esfera
# EN: POINTED SNOUT — cone + sphere
mk_cone("Zorro_HocicoBase",   0.32, 0.05, 0.48,
        (0, -1.08, 2.06), MAT_CREMA, rot=(math.pi/2, 0, 0))
mk_sphere("Zorro_HocicoPunta",0.20, (0, -1.22, 2.06), MAT_CREMA,     scale=(1.0, 0.75, 0.75))
mk_sphere("Zorro_Nariz",      0.09, (0, -1.36, 2.14), MAT_NARIZ,     scale=(1.22, 0.55, 0.72))

# ES: MEJILLAS ROSADAS kawaii / EN: KAWAII PINK CHEEKS
for side, ex in (("R", 0.42), ("L", -0.42)):
    mk_sphere(f"Zorro_Mejilla_{side}", 0.18, (ex, -1.00, 2.02), MAT_ROSA, scale=(1.2, 0.38, 0.88))

# ES: BIGOTES prominentes (cilindros finos)
# EN: PROMINENT WHISKERS (thin cylinders)
for side, sx, ang in (("R", 0.30, 0.12), ("L", -0.30, -0.12)):
    for i, wz in enumerate((0.06, 0.00, -0.06)):
        mk_cylinder(f"Zorro_Big_{side}_{i}", 0.014, 0.42,
                    (sx + 0.21, -1.10, 2.00 + wz),
                    MAT_NEGRO, rot=(0, 0, ang + i * 0.08))

# ES: OJOS con iris ámbar y pupila vertical + brillo
# EN: EYES with amber iris and vertical pupil + highlight
for side, ex in (("R", 0.30), ("L", -0.30)):
    mk_sphere(f"Zorro_OjoBlanco_{side}", 0.135, (ex, -0.96, 2.28), MAT_BLANCO,     scale=(1.0, 0.42, 1.0))
    mk_sphere(f"Zorro_Iris_{side}",      0.108, (ex, -1.06, 2.28), MAT_IRIS,       scale=(1.0, 0.28, 1.0))
    mk_sphere(f"Zorro_Pupila_{side}",    0.065, (ex, -1.10, 2.28), MAT_PUPILA,     scale=(0.35, 0.16, 1.2))
    mk_sphere(f"Zorro_Brillo_{side}",    0.028, (ex+0.04, -1.11, 2.32), MAT_BRILLO)

# ES: OREJAS ENORMES fennec — con pelaje en el borde exterior
# EN: HUGE FENNEC EARS — with fur on the outer edge
for side, ex, ang_z in (("R", 0.56, 0.18), ("L", -0.56, -0.18)):
    mk_cone(f"Zorro_OrejaExt_{side}", 0.40, 0.04, 0.86,
            (ex, -0.06, 2.86),
            MAT_NARANJA, rot=(0.15, 0, ang_z))
    mk_cone(f"Zorro_OrejaInt_{side}", 0.28, 0.02, 0.65,
            (ex*0.94, -0.12, 2.84),
            MAT_INTERIOR_OR, rot=(0.15, 0, ang_z))
    # ES: Mechones de pelo en el borde interior de la oreja
    # EN: Fur tufts on the inner edge of the ear
    for fi, fpos in enumerate(((0.0, 0.12),(0.08, 0.06),(-0.08, 0.06))):
        mk_sphere(f"Zorro_OrejaFur_{side}_{fi}", 0.10,
                  (ex + fpos[0]*(1 if ex>0 else -1), -0.08, 2.72+fpos[1]),
                  MAT_BLANCO, scale=(0.60, 0.35, 0.65))

# ES: PATAS ágiles con pequeños mechones en los pies
# EN: AGILE LEGS with small fur tufts on the paws
for side, lx, ry in (("RD", 0.42,  0.18), ("LD", -0.42, -0.18)):
    mk_cylinder(f"Zorro_MusloD_{side}", 0.18, 0.65, (lx, -0.20, 0.65), MAT_NARANJA,    rot=(0.28, 0, ry))
    mk_cylinder(f"Zorro_TibiaD_{side}", 0.14, 0.54, (lx, -0.32, 0.18), MAT_NARANJA_OSC, rot=(0.10, 0, ry*0.4))
    mk_sphere(f"Zorro_PataD_{side}",    0.18, (lx, -0.44, -0.10), MAT_CREMA,    scale=(1.12, 1.40, 0.58))
    mk_sphere(f"Zorro_PataFur_{side}",  0.14, (lx, -0.36, -0.04), MAT_BLANCO,   scale=(1.20, 0.45, 0.68))

for side, lx, ry in (("RT", 0.38,  0.15), ("LT", -0.38, -0.15)):
    mk_cylinder(f"Zorro_MusloT_{side}", 0.20, 0.68, (lx,  0.45, 0.66), MAT_NARANJA,    rot=(-0.30, 0, ry))
    mk_cylinder(f"Zorro_TibiaT_{side}", 0.15, 0.54, (lx,  0.62, 0.18), MAT_NARANJA_OSC, rot=(-0.12, 0, ry*0.4))
    mk_sphere(f"Zorro_PataT_{side}",    0.18, (lx,  0.78, -0.10), MAT_CREMA,    scale=(1.0, 1.50, 0.55))
    mk_sphere(f"Zorro_PataFurT_{side}", 0.14, (lx,  0.68, -0.02), MAT_BLANCO,   scale=(1.15, 0.42, 0.65))

# ES: COLA ESPONJOSA con muchos mechones de pelo = muy cute
# EN: FLUFFY TAIL with many fur tufts = very cute
mk_sphere("Zorro_ColaBase1",  0.34, (0,  0.84, 0.94), MAT_COLA_BASE,  scale=(0.90, 1.22, 0.90))
mk_sphere("Zorro_ColaBase2",  0.40, (0,  1.08, 0.80), MAT_COLA_BASE,  scale=(1.02, 1.32, 1.02))
mk_sphere("Zorro_ColaMid",    0.46, (0,  1.30, 0.60), MAT_COLA_BASE,  scale=(1.12, 1.38, 1.12))
mk_sphere("Zorro_ColaPunta",  0.40, (0,  1.52, 0.38), MAT_COLA_PUNTA, scale=(0.97, 1.22, 0.97))
mk_sphere("Zorro_ColaTuft",   0.25, (0,  1.68, 0.25), MAT_BLANCO,     scale=(0.88, 1.05, 0.88))
# ES: Mechones de pelo de la cola / EN: Tail fur strands
cola_tufts = [
    ( 0.35, 1.18, 0.72), (-0.35, 1.18, 0.72),
    ( 0.42, 1.42, 0.45), (-0.42, 1.42, 0.45),
    ( 0.28, 1.60, 0.22), (-0.28, 1.60, 0.22),
    ( 0.00, 1.72, 0.12),
]
for i, pos in enumerate(cola_tufts):
    mk_sphere(f"Zorro_ColaFur_{i}", 0.17, pos, MAT_COLA_PUNTA, scale=(0.75, 1.0, 0.75))

# ── 5. Armadura / Armature ────────────────────────────────────────
bpy.ops.object.select_all(action="DESELECT")
bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
arm_obj      = bpy.context.active_object
arm_obj.name = "Zorro_Armature"
arm          = arm_obj.data
arm.name     = "Zorro_Arm"

for b in list(arm.edit_bones):
    arm.edit_bones.remove(b)

def add_bone(name, head, tail, parent=None):
    """
    ES: Crea un hueso en la armadura en modo edición.
    EN: Creates a bone in the armature in edit mode.
    """
    b = arm.edit_bones.new(name)
    b.head = head; b.tail = tail
    if parent:
        b.parent = arm.edit_bones[parent]
        b.use_connect = False
    return b

# ES: Jerarquía de huesos del Zorro / EN: Fox bone hierarchy
# Root → Body → Head → EarR / EarL
#              → TailBase → TailMid → TailTip
#              → FrontLegR → FrontLowerR
#              → FrontLegL → FrontLowerL
#              → BackLegR  → BackLowerR
#              → BackLegL  → BackLowerL
add_bone("Root",        (0,  0.00, 0.00), (0,  0.00, 0.30))
add_bone("Body",        (0,  0.00, 0.70), (0,  0.00, 1.52), "Root")
add_bone("Head",        (0, -0.22, 1.60), (0, -0.42, 2.30), "Body")
add_bone("EarR",        ( 0.55, -0.05, 2.35), ( 0.52, -0.08, 2.88), "Head")
add_bone("EarL",        (-0.55, -0.05, 2.35), (-0.52, -0.08, 2.88), "Head")
add_bone("TailBase",    (0,  0.80, 0.92), (0,  1.08, 0.75), "Body")
add_bone("TailMid",     (0,  1.08, 0.75), (0,  1.32, 0.55), "TailBase")
add_bone("TailTip",     (0,  1.32, 0.55), (0,  1.55, 0.32), "TailMid")
add_bone("FrontLegR",   ( 0.42, -0.18, 0.80), ( 0.42, -0.34, 0.38), "Body")
add_bone("FrontLowerR", ( 0.42, -0.34, 0.38), ( 0.42, -0.44, 0.00), "FrontLegR")
add_bone("FrontLegL",   (-0.42, -0.18, 0.80), (-0.42, -0.34, 0.38), "Body")
add_bone("FrontLowerL", (-0.42, -0.34, 0.38), (-0.42, -0.44, 0.00), "FrontLegL")
add_bone("BackLegR",    ( 0.38,  0.42, 0.82), ( 0.38,  0.62, 0.38), "Body")
add_bone("BackLowerR",  ( 0.38,  0.62, 0.38), ( 0.38,  0.78,-0.04), "BackLegR")
add_bone("BackLegL",    (-0.38,  0.42, 0.82), (-0.38,  0.62, 0.38), "Body")
add_bone("BackLowerL",  (-0.38,  0.62, 0.38), (-0.38,  0.78,-0.04), "BackLegL")

bpy.ops.object.mode_set(mode="OBJECT")

# ── 6. Parentar mallas / Parent meshes ────────────────────────────
bpy.ops.object.select_all(action="DESELECT")
for part in mesh_parts:
    part.select_set(True)
arm_obj.select_set(True)
bpy.context.view_layer.objects.active = arm_obj
bpy.ops.object.parent_set(type="ARMATURE_AUTO")

# ── 7. Animaciones / Animations ───────────────────────────────────
bpy.context.view_layer.objects.active = arm_obj
bpy.ops.object.mode_set(mode="POSE")
scene            = bpy.context.scene
scene.render.fps = FPS


def kf_rot(bone_name, euler, frame):
    """
    ES: Keyframe de rotación en un hueso de pose.
    EN: Rotation keyframe on a pose bone.
    """
    pb = arm_obj.pose.bones.get(bone_name)
    if pb:
        pb.rotation_mode = "XYZ"
        pb.rotation_euler = euler
        pb.keyframe_insert("rotation_euler", frame=frame)


def kf_loc(bone_name, loc, frame):
    """
    ES: Keyframe de localización en un hueso de pose.
    EN: Location keyframe on a pose bone.
    """
    pb = arm_obj.pose.bones.get(bone_name)
    if pb:
        pb.location = loc
        pb.keyframe_insert("location", frame=frame)


def clear_pose():
    """
    ES: Resetea todos los huesos a posición neutra.
    EN: Resets all bones to neutral position.
    """
    for pb in arm_obj.pose.bones:
        pb.rotation_mode  = "XYZ"
        pb.rotation_euler = (0, 0, 0)
        pb.location       = (0, 0, 0)


arm_obj.animation_data_create()
all_actions = {}

# ── IDLE (respiración lenta + cola esponjosa) ─────────────────────
# ES: Clip 1 – el Zorro respira tranquilo y la cola se balancea suavemente.
# EN: Clip 1 – the Fox breathes calmly and the tail sways gently.
a = bpy.data.actions.new("Idle")
all_actions["Idle"] = a
arm_obj.animation_data.action = a
clear_pose()

for f, z in ((1, 0.000), (14, 0.028), (28, 0.000), (42, 0.028), (48, 0.000)):
    kf_loc("Body", (0, 0, z), f)

# ES: Cola esponjosa se balancea en arco suave
# EN: Fluffy tail sways in a gentle arc
for f, rz in ((1, 0.00), (10, 0.20), (22, 0.00), (34, -0.20), (48, 0.00)):
    kf_rot("TailMid", (0, 0, rz), f)
    kf_rot("TailTip", (0, 0, rz * 1.6), f)

# ES: Orejas leve movimiento independiente / EN: Ears slight independent movement
for f, rx in ((1, 0.00), (18, 0.08), (36, -0.05), (48, 0.00)):
    kf_rot("EarR", (rx, 0,  0.05), f)
    kf_rot("EarL", (rx, 0, -0.05), f)

# ── LISTEN (orejas giradas al sonido) ─────────────────────────────
# ES: Clip 2 – la característica más especial del Fennec:
#     las enormes orejas se giran hacia la fuente del sonido.
# EN: Clip 2 – the Fennec's most special trait:
#     the huge ears rotate toward the sound source.
a = bpy.data.actions.new("Listen")
all_actions["Listen"] = a
arm_obj.animation_data.action = a
clear_pose()

# ES: Orejas adelante hacia el sonido
# EN: Ears forward toward the sound
for f, rx, rz in (
    (1,  0.00,  0.00), (10, 0.42, -0.20), (36, 0.42, -0.20), (48, 0.00, 0.00)
):
    kf_rot("EarR", (rx, 0, -rz), f)
    kf_rot("EarL", (rx, 0,  rz), f)

# ES: Cabeza ligeramente adelantada = concentración
# EN: Head slightly forward = concentration
for f, rx in ((1, 0.00), (10, -0.12), (36, -0.12), (48, 0.00)):
    kf_rot("Head", (rx, 0, 0), f)

for f, rz in ((1, 0.00), (24, 0.12), (48, 0.00)):
    kf_rot("TailTip", (0, 0, rz), f)

# ── THINK (cabeza ladeada + oreja pensativa) ──────────────────────
# ES: Clip 3 – el Zorro ladea la cabeza curioso, una oreja cae un poco.
# EN: Clip 3 – the Fox tilts its head curiously, one ear droops.
a = bpy.data.actions.new("Think")
all_actions["Think"] = a
arm_obj.animation_data.action = a
clear_pose()

for f, rz in ((1, 0.00), (12, 0.40), (32, 0.40), (44, 0.00), (48, 0.00)):
    kf_rot("Head", (0, 0, rz), f)

# ES: Oreja izquierda se inclina ligeramente al ladear
# EN: Left ear tilts slightly when head tilts
for f, rz in ((1, 0.00), (12, 0.20), (32, 0.20), (44, 0.00), (48, 0.00)):
    kf_rot("EarL", (0, 0, rz), f)

for f, rz in ((1, 0.00), (20, 0.10), (40, -0.10), (48, 0.00)):
    kf_rot("TailMid", (0, 0, rz), f)

# ── SPEAK (hocico + cuerpo animado) ──────────────────────────────
# ES: Clip 4 – el cuerpo y la cabeza pulsan con el habla,
#     las orejas tiemblan con entusiasmo.
# EN: Clip 4 – body and head pulse with speech,
#     ears tremble enthusiastically.
a = bpy.data.actions.new("Speak")
all_actions["Speak"] = a
arm_obj.animation_data.action = a
clear_pose()

# ES: Pulso de habla (6 sílabas) / EN: Speech pulse (6 syllables)
for i, f in enumerate([1, 8, 16, 24, 32, 40, 48]):
    up   = 0.030 if i % 2 == 0 else -0.005
    ear  = 0.08  if i % 2 == 0 else -0.04
    kf_loc("Head",  (0, 0, up),  f)
    kf_rot("EarR",  (0, 0,  ear), f)
    kf_rot("EarL",  (0, 0, -ear), f)

# ES: Cola viva mientras habla / EN: Lively tail while speaking
for f, rz in ((1, 0.0), (12, 0.25), (24, -0.25), (36, 0.20), (48, 0.0)):
    kf_rot("TailMid", (0, 0, rz), f)

# ── HAPPY (saltito + orejas arriba + cola eufórica) ───────────────
# ES: Clip 5 – el Zorro salta de alegría con las orejas muy erguidas
#     y la cola agitándose sin control.
# EN: Clip 5 – the Fox jumps for joy with ears very upright
#     and the tail wagging uncontrollably.
a = bpy.data.actions.new("Happy")
all_actions["Happy"] = a
arm_obj.animation_data.action = a
clear_pose()

# ES: Salto con doble rebote / EN: Jump with double bounce
for f, z in (
    (1, 0.00), (8, 0.32), (15, 0.00), (22, 0.20), (30, 0.00), (38, 0.08), (48, 0.00)
):
    kf_loc("Root", (0, 0, z), f)

# ES: Orejas muy erectas en el salto / EN: Ears very erect on jump
for f, rx in ((1, 0.0), (8, -0.30), (15, 0.0), (22, -0.25), (48, 0.0)):
    kf_rot("EarR", (rx, 0,  0.05), f)
    kf_rot("EarL", (rx, 0, -0.05), f)

# ES: Cola eufórica / EN: Euphoric tail
for f, rz in (
    (1, 0.0), (6, 0.70), (12, -0.70), (18, 0.90),
    (24, -0.80), (32, 0.60), (40, -0.40), (48, 0.0)
):
    kf_rot("TailMid", (0, 0, rz), f)
    kf_rot("TailTip", (0, 0, rz * 1.8), f)

bpy.ops.object.mode_set(mode="OBJECT")

# ── 8. Publicar en NLA / Push to NLA ──────────────────────────────
# ES: Cada acción se convierte en pista NLA independiente para
#     que Three.js / Babylon.js la reproduzca por nombre.
# EN: Each action becomes an independent NLA track so
#     Three.js / Babylon.js can play it by name.
arm_obj.animation_data_create()
for name, action in all_actions.items():
    track       = arm_obj.animation_data.nla_tracks.new()
    track.name  = name
    strip       = track.strips.new(name, 1, action)
    strip.action_frame_start = 1
    strip.action_frame_end   = CLIP_FRAMES
    strip.frame_start        = 1
    strip.frame_end          = CLIP_FRAMES

arm_obj.animation_data.action = None

# ── 9. Exportar GLB / Export GLB ──────────────────────────────────
scene.frame_start = 1
scene.frame_end   = CLIP_FRAMES

bpy.ops.object.select_all(action="SELECT")

bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format="GLB",
    export_apply=True,
    export_animations=True,
    export_nla_strips=True,
    export_anim_mode="NLA_TRACKS",
    export_skins=True,
    export_morph=True,
)

print(f"\n✅ Zorro Fennec exportado / Fennec Fox exported → {output_path}")
print("   Animaciones NLA / NLA animations: Idle, Listen, Think, Speak, Happy")
