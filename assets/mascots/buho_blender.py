"""
buho_blender.py
---------------
ES: Crea un Búho Sabio 3D estilo cartoon/chibi para GaIA.
    Ojos enormes y expresivos, disco facial en forma de corazón,
    penachos en la cabeza, cuerpo redondo y alas. Armadura + 5 clips NLA.
EN: Creates a cartoon/chibi-style Wise Owl 3D for GaIA.
    Huge expressive eyes, heart-shaped facial disk, ear tufts,
    round body and wings. Full armature + 5 NLA animation clips.

Animaciones / Animations:
  Idle    – respiración + alas ligeras + cuerpo balanceante
  Listen  – rotación característica de cabeza (búho puede girarla mucho)
  Think   – cabeza baja + penachos bajos = pensativo
  Speak   – pico pulsante + cuerpo animado
  Happy   – alas abiertas al cielo + salto entusiasta

Uso / Usage (Blender headless):
    blender --background --python assets/mascots/buho_blender.py
"""

import bpy
import math
import os

# ── Configuración / Configuration ─────────────────────────────────
OUTPUT_FILE = "buho.glb"
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
    ES: Crea material Principled BSDF con valores PBR básicos.
    EN: Creates Principled BSDF material with basic PBR values.
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

# ES: Paleta del Búho / EN: Owl colour palette
MAT_MARRÓN       = make_mat("Buho_Marron",      (0.45, 0.28, 0.10), roughness=0.85, subsurface=0.08)
MAT_MARRÓN_OSC   = make_mat("Buho_MarronOsc",   (0.28, 0.15, 0.04), roughness=0.88, subsurface=0.05)
MAT_MARRÓN_MED   = make_mat("Buho_MarronMed",   (0.58, 0.38, 0.16), roughness=0.83, subsurface=0.06)
MAT_CREMA        = make_mat("Buho_Crema",        (0.94, 0.87, 0.72), roughness=0.80, subsurface=0.12)
MAT_DISCO        = make_mat("Buho_DiscoFacial",  (0.90, 0.80, 0.62), roughness=0.76, subsurface=0.14)
MAT_PICO         = make_mat("Buho_Pico",         (0.92, 0.68, 0.12), roughness=0.42)
MAT_OJO_AMARILLO = make_mat("Buho_OjoAmbar",     (0.90, 0.65, 0.05), roughness=0.05)
MAT_OJO_ANILLO   = make_mat("Buho_OjoAnillo",    (0.14, 0.09, 0.02), roughness=0.32)
MAT_PUPILA       = make_mat("Buho_Pupila",       (0.02, 0.02, 0.02), roughness=0.03)
MAT_BRILLO       = make_mat("Buho_Brillo",       (0.99, 0.99, 0.99), roughness=0.01)
MAT_ALA          = make_mat("Buho_Ala",          (0.35, 0.22, 0.08), roughness=0.86, subsurface=0.05)
MAT_ALA_PLUMA    = make_mat("Buho_AlaPluma",     (0.22, 0.13, 0.04), roughness=0.90, subsurface=0.04)
MAT_ALA_CLARA    = make_mat("Buho_AlaClara",     (0.62, 0.42, 0.18), roughness=0.84, subsurface=0.05)
MAT_GARRA        = make_mat("Buho_Garra",        (0.72, 0.58, 0.22), roughness=0.40)
MAT_RAMA         = make_mat("Buho_Rama",         (0.32, 0.20, 0.07), roughness=0.92)
MAT_ROSA         = make_mat("Buho_Mejilla",      (1.00, 0.72, 0.72), roughness=0.70, subsurface=0.22)

# ── 3. Utilidades de geometría / Geometry helpers ─────────────────
mesh_parts = []

def _reg(obj):
    bpy.ops.object.shade_smooth()
    mesh_parts.append(obj)
    return obj

def mk_sphere(name, r, loc, mat, scale=(1,1,1), subdiv=2):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=24, ring_count=16)
    o = bpy.context.active_object
    o.name = name;  o.scale = scale
    o.data.materials.append(mat)
    mod = o.modifiers.new("Sub", "SUBSURF")
    mod.levels = subdiv; mod.render_levels = 3
    return _reg(o)

def mk_cylinder(name, r, depth, loc, mat, rot=(0,0,0), verts=16):
    bpy.ops.mesh.primitive_cylinder_add(
        radius=r, depth=depth, location=loc, vertices=verts)
    o = bpy.context.active_object
    o.name = name;  o.rotation_euler = rot
    o.data.materials.append(mat)
    return _reg(o)

def mk_cone(name, r1, r2, depth, loc, mat, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cone_add(
        radius1=r1, radius2=r2, depth=depth, location=loc, vertices=16)
    o = bpy.context.active_object
    o.name = name;  o.rotation_euler = rot
    o.data.materials.append(mat)
    return _reg(o)

def mk_torus(name, major_r, minor_r, loc, mat, rot=(0,0,0)):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_r, minor_radius=minor_r,
        major_segments=32, minor_segments=12, location=loc)
    o = bpy.context.active_object
    o.name = name;  o.rotation_euler = rot
    o.data.materials.append(mat)
    return _reg(o)

# ── 4. Geometría del Búho / Owl Geometry ──────────────────────────

# ES: CUERPO RECHONCHO CHIBI — el búho tiene más cabeza que cuerpo
# EN: CHIBI CHUBBY BODY — the owl has more head than body
mk_sphere("Buho_Cuerpo",      1.08, (0,  0.00, 1.08), MAT_MARRÓN,    scale=(1.0, 0.80, 1.02))
mk_sphere("Buho_Vientre",     0.75, (0, -0.46, 1.00), MAT_CREMA,     scale=(0.82, 0.58, 0.76))

# ES: PLUMAS del vientre — filas de plumas escalonadas
# EN: BELLY FEATHERS — staggered rows of feathers
belly_feathers = [
    ( 0.20, -0.65, 1.20), (-0.20, -0.65, 1.20),
    ( 0.38, -0.58, 1.00), (-0.38, -0.58, 1.00),
    ( 0.00, -0.70, 0.95),
    ( 0.22, -0.60, 0.75), (-0.22, -0.60, 0.75),
]
for i, pos in enumerate(belly_feathers):
    mk_sphere(f"Buho_PlumaPecho_{i}", 0.15, pos, MAT_CREMA, scale=(1.6, 0.38, 0.55))

# ES: PLUMAS LATERALES del cuerpo (marrones)
# EN: LATERAL BODY FEATHERS (brown)
body_feathers = [
    ( 0.88, 0.22, 1.22), (-0.88, 0.22, 1.22),
    ( 0.82, 0.40, 0.96), (-0.82, 0.40, 0.96),
    ( 0.78, 0.55, 0.72), (-0.78, 0.55, 0.72),
    ( 0.00, 0.78, 1.38), ( 0.00, 0.62, 1.00),
]
for i, pos in enumerate(body_feathers):
    mk_sphere(f"Buho_PlumaLat_{i}", 0.18, pos, MAT_MARRÓN_MED, scale=(1.5, 0.42, 0.60))

# ES: CABEZA — muy redonda y grande (¡esto es lo más adorable del búho!)
# EN: HEAD  — very round and large (the most adorable owl feature!)
mk_sphere("Buho_Cabeza",      0.96, (0, -0.12, 2.28), MAT_MARRÓN,    scale=(1.03, 0.91, 1.01))

# ES: DISCO FACIAL en corazón — señal de búho real, aquí muy exagerado y cute
# EN: HEART-SHAPED FACIAL DISK — real owl feature, here very exaggerated and cute
for side, dx in (("R", 0.29), ("L", -0.29)):
    mk_sphere(f"Buho_Disco_{side}", 0.54, (dx, -0.80, 2.24), MAT_DISCO, scale=(0.70, 0.38, 0.80))
mk_sphere("Buho_DiscoC",      0.40, (0, -0.88, 2.22), MAT_DISCO,     scale=(0.92, 0.35, 0.74))
# ES: Borde del disco facial (anillo de plumas) / EN: Facial disk border (feather ring)
disk_border = [
    ( 0.60, -0.62, 2.45), (-0.60, -0.62, 2.45),
    ( 0.70, -0.72, 2.20), (-0.70, -0.72, 2.20),
    ( 0.52, -0.70, 1.96), (-0.52, -0.70, 1.96),
    ( 0.00, -0.68, 2.60), ( 0.00, -0.70, 1.90),
]
for i, pos in enumerate(disk_border):
    mk_sphere(f"Buho_DiscoBorde_{i}", 0.14, pos, MAT_MARRÓN_OSC, scale=(0.95, 0.40, 1.0))

# ES: MEJILLAS ROSADAS (debajo del disco) / EN: PINK CHEEKS (below the disk)
for side, ex in (("R", 0.40), ("L", -0.40)):
    mk_sphere(f"Buho_Mejilla_{side}", 0.16, (ex, -0.98, 2.12), MAT_ROSA, scale=(1.2, 0.38, 0.88))

# ES: OJOS ENORMES — anillo marrón oscuro + iris ámbar + pupila negra + brillo
# EN: HUGE EYES — dark brown ring + amber iris + black pupil + highlight
for side, ex in (("R", 0.30), ("L", -0.30)):
    mk_torus(f"Buho_AnilloOjo_{side}", 0.200, 0.058,
             (ex, -0.94, 2.32), MAT_OJO_ANILLO, rot=(math.pi/2, 0, 0))
    mk_sphere(f"Buho_Iris_{side}",     0.182, (ex, -0.98, 2.32), MAT_OJO_AMARILLO, scale=(1.0, 0.38, 1.0))
    mk_sphere(f"Buho_Pupila_{side}",   0.112, (ex, -1.03, 2.32), MAT_PUPILA,       scale=(1.0, 0.22, 1.0))
    mk_sphere(f"Buho_Brillo_{side}",   0.042, (ex+0.06, -1.04, 2.40), MAT_BRILLO)
    # ES: Cejas arqueadas de plumas / EN: Arched feather eyebrows
    mk_sphere(f"Buho_Ceja_{side}",     0.13,  (ex, -0.82, 2.54), MAT_MARRÓN_OSC,  scale=(1.35, 0.30, 0.38))

# ES: PICO pequeño y curvado / EN: SMALL CURVED BEAK
mk_cone("Buho_Pico", 0.10, 0.01, 0.24, (0, -1.06, 2.14), MAT_PICO, rot=(math.pi/2, 0, 0))

# ES: PENACHOS con plumas internas claras — adorables
# EN: EAR TUFTS with light inner feathers — adorable
for side, ex, ang_z in (("R", 0.40, 0.20), ("L", -0.40, -0.20)):
    mk_cone(f"Buho_Penacho_{side}",    0.15, 0.02, 0.46,
            (ex, -0.02, 2.94), MAT_MARRÓN_OSC, rot=(0.08, 0, ang_z))
    mk_cone(f"Buho_PenachoInt_{side}", 0.09, 0.01, 0.32,
            (ex*0.84, -0.08, 2.92), MAT_CREMA, rot=(0.08, 0, ang_z))
    # ES: Plumita extra / EN: Extra small feather
    mk_sphere(f"Buho_PenachoPluma_{side}", 0.08, (ex*0.92, -0.04, 3.05),
              MAT_MARRÓN_MED, scale=(0.7, 0.35, 0.8))

# ES: ALAS — 4 capas de plumas por ala para aspecto real
#     Cada capa tiene un color y tamaño diferente = textura de plumas
# EN: WINGS — 4 feather layers per wing for realistic look
#     Each layer has different colour and size = feather texture
for side, wx, ang_y in (("R", 1.18, 0.25), ("L", -1.18, -0.25)):
    # ES: Ala base / EN: Base wing
    mk_sphere(f"Buho_Ala_{side}",        0.82, (wx,  0.00, 1.08), MAT_ALA,
              scale=(0.48, 0.55, 1.08))
    # ES: Capa 1 de plumas (cobertoras) / EN: Feather layer 1 (coverts)
    mk_sphere(f"Buho_AlaP1_{side}",      0.68, (wx*0.97,  0.14, 0.82), MAT_ALA_PLUMA,
              scale=(0.42, 0.42, 0.82))
    # ES: Capa 2 de plumas (secundarias) / EN: Feather layer 2 (secondaries)
    mk_sphere(f"Buho_AlaP2_{side}",      0.55, (wx*0.94,  0.26, 0.56), MAT_MARRÓN_MED,
              scale=(0.36, 0.38, 0.66))
    # ES: Capa 3 de plumas (primarias) / EN: Feather layer 3 (primaries)
    mk_sphere(f"Buho_AlaP3_{side}",      0.42, (wx*0.92,  0.36, 0.32), MAT_ALA_CLARA,
              scale=(0.30, 0.35, 0.52))
    # ES: Punta del ala / EN: Wing tip
    mk_cone(f"Buho_AlaPunta_{side}",    0.26, 0.01, 0.52,
            (wx*1.03, 0.38, 0.28), MAT_ALA_PLUMA, rot=(-0.45, 0, ang_y))
    # ES: Plumas individuales sueltas en el borde del ala
    # EN: Individual loose feathers on wing edge
    for fi, (fy, fz) in enumerate(((0.18, 0.70),(0.28, 0.50),(0.40, 0.30))):
        mk_sphere(f"Buho_AlaFeather_{side}_{fi}", 0.12,
                  (wx*0.98, fy, fz), MAT_MARRÓN_OSC, scale=(0.28, 1.2, 0.35))

# ES: PATAS CORTAS con garras en rama / EN: SHORT LEGS with talons on branch
for side, lx in (("R", 0.30), ("L", -0.30)):
    mk_cylinder(f"Buho_Pata_{side}",  0.12, 0.44, (lx, 0.00, 0.42), MAT_MARRÓN, rot=(0,0,0))
    # ES: Plumas escamosas en la pata / EN: Scale-like feathers on the leg
    for pi, pz in enumerate((0.52, 0.38, 0.28)):
        mk_sphere(f"Buho_PataEscama_{side}_{pi}", 0.07, (lx, 0.02, pz),
                  MAT_MARRÓN_MED, scale=(1.1, 0.55, 0.45))
    # ES: 3 dedos con garra hacia adelante / EN: 3 talons pointing forward
    for gi, (gy, gz_ang) in enumerate(
        ((-0.20, 0.0), (-0.15, 0.25), (-0.15, -0.25))
    ):
        mk_cone(f"Buho_Dedo_{side}_{gi}", 0.055, 0.008, 0.32,
                (lx + gi*0.06 - 0.06, gy, 0.18),
                MAT_GARRA, rot=(0.45, 0, gz_ang))

# ES: RAMA en la que se posa el búho (con nudos)
# EN: BRANCH the owl perches on (with knots)
mk_cylinder("Buho_Rama",      0.16, 2.60, (0, 0, 0.10), MAT_RAMA, rot=(0, math.pi/2, 0))
mk_sphere("Buho_RamaNudo1",   0.22, ( 0.60, 0.00, 0.10), MAT_MARRÓN_OSC, scale=(0.7, 1.2, 0.7))
mk_sphere("Buho_RamaNudo2",   0.18, (-0.55, 0.00, 0.10), MAT_MARRÓN_OSC, scale=(0.7, 1.2, 0.7))

# ── 5. Armadura / Armature ────────────────────────────────────────
bpy.ops.object.select_all(action="DESELECT")
bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
arm_obj      = bpy.context.active_object
arm_obj.name = "Buho_Armature"
arm          = arm_obj.data
arm.name     = "Buho_Arm"

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

# ES: Jerarquía de huesos del Búho / EN: Owl bone hierarchy
# Root → Body → Head → TuftR / TuftL
#              → WingR (ala derecha)
#              → WingL (ala izquierda)
#              → LegR  → ToeR
#              → LegL  → ToeL
add_bone("Root",   (0,  0.00, 0.00), (0,  0.00, 0.30))
add_bone("Body",   (0,  0.00, 0.85), (0,  0.00, 1.65), "Root")
add_bone("Head",   (0, -0.08, 1.72), (0, -0.15, 2.48), "Body")
add_bone("TuftR",  ( 0.38, -0.00, 2.65), ( 0.35, -0.05, 2.98), "Head")
add_bone("TuftL",  (-0.38, -0.00, 2.65), (-0.35, -0.05, 2.98), "Head")
add_bone("WingR",  ( 0.60,  0.00, 1.05), ( 1.30,  0.20, 0.58), "Body")
add_bone("WingL",  (-0.60,  0.00, 1.05), (-1.30,  0.20, 0.58), "Body")
add_bone("LegR",   ( 0.30, -0.02, 0.60), ( 0.30, -0.05, 0.20), "Body")
add_bone("ToeR",   ( 0.30, -0.05, 0.20), ( 0.30, -0.22, 0.10), "LegR")
add_bone("LegL",   (-0.30, -0.02, 0.60), (-0.30, -0.05, 0.20), "Body")
add_bone("ToeL",   (-0.30, -0.05, 0.20), (-0.30, -0.22, 0.10), "LegL")

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
    ES: Inserta keyframe de rotación en hueso de pose.
    EN: Inserts rotation keyframe on pose bone.
    """
    pb = arm_obj.pose.bones.get(bone_name)
    if pb:
        pb.rotation_mode = "XYZ"
        pb.rotation_euler = euler
        pb.keyframe_insert("rotation_euler", frame=frame)


def kf_loc(bone_name, loc, frame):
    """
    ES: Inserta keyframe de localización en hueso de pose.
    EN: Inserts location keyframe on pose bone.
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

# ── IDLE (respiración + alas ligeras) ────────────────────────────
# ES: Clip 1 – el Búho respira tranquilo posado en su rama.
#     Las alas se elevan ligeramente con cada respiración.
# EN: Clip 1 – the Owl breathes calmly perched on its branch.
#     Wings rise slightly with each breath.
a = bpy.data.actions.new("Idle")
all_actions["Idle"] = a
arm_obj.animation_data.action = a
clear_pose()

# ES: Cuerpo sube/baja = respiración / EN: Body rises/falls = breathing
for f, z in ((1, 0.000), (14, 0.025), (28, 0.000), (42, 0.025), (48, 0.000)):
    kf_loc("Body", (0, 0, z), f)

# ES: Alas ligeramente abiertas/cerradas con la respiración
# EN: Wings slightly open/close with breathing
for f, rx in ((1, 0.00), (14, 0.08), (28, 0.00), (42, 0.08), (48, 0.00)):
    kf_rot("WingR", (rx, 0,  0.0), f)
    kf_rot("WingL", (rx, 0,  0.0), f)

# ES: Penachos leve movimiento independiente / EN: Tufts slight independent movement
for f, rx in ((1, 0.00), (20, 0.10), (40, -0.05), (48, 0.00)):
    kf_rot("TuftR", (rx, 0,  0.04), f)
    kf_rot("TuftL", (rx, 0, -0.04), f)

# ── LISTEN (rotación de cabeza única del búho) ───────────────────
# ES: Clip 2 – los búhos pueden girar la cabeza ~270°.
#     Esta animación simula ese giro dramático hacia el lado.
# EN: Clip 2 – owls can rotate their head ~270°.
#     This animation simulates that dramatic sideways turn.
a = bpy.data.actions.new("Listen")
all_actions["Listen"] = a
arm_obj.animation_data.action = a
clear_pose()

# ES: Giro dramático de cabeza y regreso
# EN: Dramatic head turn and return
for f, rz in (
    (1, 0.00), (10, 0.90), (28, 0.90), (40, -0.15), (48, 0.00)
):
    kf_rot("Head", (0, 0, rz), f)

# ES: Penachos se elevan ante el sonido / EN: Tufts rise at the sound
for f, rx in ((1, 0.00), (10, -0.22), (28, -0.22), (40, 0.05), (48, 0.00)):
    kf_rot("TuftR", (rx, 0,  0.0), f)
    kf_rot("TuftL", (rx, 0,  0.0), f)

# ── THINK (cabeza baja + penachos caídos = sabiduría) ─────────────
# ES: Clip 3 – el Búho Sabio baja la cabeza reflexionando.
#     Los penachos también caen = apariencia de profundo pensamiento.
# EN: Clip 3 – the Wise Owl bows its head in reflection.
#     The tufts also lower = appearance of deep thought.
a = bpy.data.actions.new("Think")
all_actions["Think"] = a
arm_obj.animation_data.action = a
clear_pose()

for f, rx in ((1, 0.00), (12, 0.38), (30, 0.38), (42, 0.00), (48, 0.00)):
    kf_rot("Head", (rx, 0, 0), f)

# ES: Penachos se inclinan hacia abajo = pensativo
# EN: Tufts tilt downward = thoughtful
for f, rx in ((1, 0.00), (12, 0.30), (30, 0.30), (42, 0.00), (48, 0.00)):
    kf_rot("TuftR", (rx, 0,  0.05), f)
    kf_rot("TuftL", (rx, 0, -0.05), f)

# ES: Alas ligeramente bajadas / EN: Wings slightly lowered
for f, rx in ((1, 0.00), (12, -0.12), (30, -0.12), (42, 0.00), (48, 0.00)):
    kf_rot("WingR", (rx, 0, 0), f)
    kf_rot("WingL", (rx, 0, 0), f)

# ── SPEAK (pico + cuerpo animado) ─────────────────────────────────
# ES: Clip 4 – el Búho habla con ritmo, el pico y cuerpo marcan el habla.
#     Los penachos se agitan entusiastas.
# EN: Clip 4 – the Owl speaks rhythmically, beak and body mark the speech.
#     The tufts quiver enthusiastically.
a = bpy.data.actions.new("Speak")
all_actions["Speak"] = a
arm_obj.animation_data.action = a
clear_pose()

for i, f in enumerate([1, 8, 16, 24, 32, 40, 48]):
    up   = 0.028 if i % 2 == 0 else -0.005
    tuft = 0.10  if i % 2 == 0 else -0.05
    kf_loc("Head", (0, 0, up), f)
    kf_rot("TuftR", (tuft, 0,  0.04), f)
    kf_rot("TuftL", (tuft, 0, -0.04), f)

# ES: Alas ligeramente abiertas durante el habla
# EN: Wings slightly open during speech
for f, rx in ((1, 0.00), (12, 0.14), (24, 0.00), (36, 0.14), (48, 0.00)):
    kf_rot("WingR", (rx, 0, 0), f)
    kf_rot("WingL", (rx, 0, 0), f)

# ── HAPPY (alas abiertas al cielo + salto) ────────────────────────
# ES: Clip 5 – el Búho despliega las alas en señal de alegría
#     y salta ligeramente de su rama.
# EN: Clip 5 – the Owl spreads its wings in joy
#     and lightly jumps off its branch.
a = bpy.data.actions.new("Happy")
all_actions["Happy"] = a
arm_obj.animation_data.action = a
clear_pose()

# ES: Salto ligero / EN: Light jump
for f, z in (
    (1, 0.00), (10, 0.28), (18, 0.00), (26, 0.15), (34, 0.00), (42, 0.06), (48, 0.00)
):
    kf_loc("Root", (0, 0, z), f)

# ES: Alas completamente abiertas en el salto
# EN: Wings fully open on the jump
for f, rx, rz in (
    (1, 0.00, 0.00), (8, -0.55, 0.25), (18, 0.00, 0.00),
    (26, -0.45, 0.20), (36, 0.00, 0.00), (48, 0.00, 0.00)
):
    kf_rot("WingR", (rx, 0,  rz), f)
    kf_rot("WingL", (rx, 0, -rz), f)

# ES: Penachos muy erectos con cada salto / EN: Tufts very erect with each jump
for f, rx in (
    (1, 0.0), (8, -0.35), (18, 0.0), (26, -0.28), (36, 0.0), (48, 0.0)
):
    kf_rot("TuftR", (rx, 0,  0.08), f)
    kf_rot("TuftL", (rx, 0, -0.08), f)

bpy.ops.object.mode_set(mode="OBJECT")

# ── 8. Publicar en NLA / Push to NLA ──────────────────────────────
# ES: Cada acción se convierte en una pista NLA independiente.
#     Permite reproducir cada animación por nombre desde Three.js / Babylon.js.
# EN: Each action becomes an independent NLA track.
#     Allows playing each animation by name from Three.js / Babylon.js.
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

print(f"\n✅ Búho exportado / Owl exported → {output_path}")
print("   Animaciones NLA / NLA animations: Idle, Listen, Think, Speak, Happy")
