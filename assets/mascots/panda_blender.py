"""
panda_blender.py  –  GaIA Mascot: Panda Chibi Cute
---------------------------------------------------
ES: Panda gigante estilo chibi. Cuerpo rechoncho, cara expresiva
    con manchas negras en ojos, pelaje simulado con capas de esferas
    ligeramente desplazadas (efecto fur/pelo), mejillas rosadas.
    Armadura completa + 5 clips NLA.
EN: Giant Panda chibi style. Chubby body, expressive face,
    simulated fur layers, pink cheeks. Full armature + 5 NLA clips.

Pelaje / Fur:
  - Mechones de pelo simulados con esferas pequeñas en el cuerpo
  - Mejillas rosadas infladas (kawaii)
  - Manchas de ojos grandes y redondeadas con textura de pelo

Uso / Usage:
    blender --background --python assets/mascots/panda_blender.py
"""

import bpy
import math
import os

OUTPUT_FILE = "panda.glb"
FPS         = 24
CLIP_FRAMES = 48

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

# ── 2. Materiales / Materials ──────────────────────────────────────
def mk_mat(name, color, roughness=0.88, subsurface=0.10):p
    """
    ES: Material PBR con subsurface alto para aspecto de pelaje suave.
    EN: PBR material with high subsurface for soft fur look.
    """
    m = bpy.data.materials.new(name=name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value  = roughness
    try:    bsdf.inputs["Subsurface Weight"].default_value = subsurface  # Blender 4.x
    except: bsdf.inputs["Subsurface"].default_value = subsurface          # Blender 3.x
    return m

M_BLANCO = mk_mat("P_Blanco",  (0.97, 0.96, 0.94), roughness=0.86, subsurface=0.14)
M_NEGRO  = mk_mat("P_Negro",   (0.05, 0.05, 0.05), roughness=0.90, subsurface=0.06)
M_ROSA   = mk_mat("P_Rosa",    (1.00, 0.72, 0.72), roughness=0.72, subsurface=0.22)
M_GRIS   = mk_mat("P_Gris",    (0.60, 0.60, 0.60), roughness=0.88, subsurface=0.08)
M_OJO_B  = mk_mat("P_OjoB",    (0.98, 0.98, 0.98), roughness=0.10, subsurface=0.02)
M_IRIS   = mk_mat("P_Iris",    (0.20, 0.55, 0.20), roughness=0.06)
M_PUPILA = mk_mat("P_Pupila",  (0.02, 0.02, 0.02), roughness=0.04)
M_BRILLO = mk_mat("P_Brillo",  (0.99, 0.99, 0.99), roughness=0.01)
M_NARIZ  = mk_mat("P_Nariz",   (0.08, 0.05, 0.05), roughness=0.45)

# ── 3. Helpers de geometría / Geometry helpers ─────────────────────
parts = []

def _r(o, subdiv=2):
    bpy.ops.object.shade_smooth()
    if subdiv:
        md = o.modifiers.new("Sub","SUBSURF")
        md.levels = subdiv; md.render_levels = 3
    parts.append(o); return o

def sph(name, r, loc, m, sc=(1,1,1), sd=2):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=24, ring_count=16)
    o = bpy.context.active_object
    o.name=name; o.scale=sc; o.data.materials.append(m)
    return _r(o,sd)

def cyl(name, r, d, loc, m, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d, location=loc, vertices=16)
    o = bpy.context.active_object
    o.name=name; o.rotation_euler=rot; o.data.materials.append(m)
    return _r(o,1)

def cone(name, r1, r2, d, loc, m, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cone_add(radius1=r1, radius2=r2, depth=d, location=loc, vertices=16)
    o = bpy.context.active_object
    o.name=name; o.rotation_euler=rot; o.data.materials.append(m)
    return _r(o,0)

# ── 4. Geometría Chibi / Chibi Geometry ───────────────────────────

# ES: CUERPO principal — muy rechoncho, casi esférico
# EN: BODY — very chubby, almost spherical
sph("P_Cuerpo",  1.18, (0,  0.00, 1.18), M_BLANCO, sc=(1.00, 0.82, 1.05))
sph("P_Barriga", 0.82, (0, -0.55, 1.02), M_BLANCO, sc=(0.88, 0.62, 0.80))

# ES: PELAJE cuerpo — mechones de pelo alrededor del torso
# EN: BODY FUR — fur tufts around the torso
fur_pos = [
    ( 0.90,  0.40, 1.38), (-0.90,  0.40, 1.38),
    ( 0.72, -0.32, 1.58), (-0.72, -0.32, 1.58),
    ( 0.55,  0.68, 0.90), (-0.55,  0.68, 0.90),
    ( 0.00,  0.75, 1.42), ( 0.00, -0.70, 1.58),
    ( 0.44,  0.82, 1.82), (-0.44,  0.82, 1.82),
]
for i, p in enumerate(fur_pos):
    sph(f"P_Pelo_{i}", 0.19, p, M_BLANCO, sc=(1.35, 0.50, 0.85), sd=1)

# ES: CABEZA grande (proporción chibi)
# EN: HEAD — big (chibi proportion)
sph("P_Cabeza",  0.98, (0, -0.22, 2.55), M_BLANCO, sc=(1.05, 0.94, 1.00))

# ES: MANCHAS OJOS grandes y redondas con mechones de pelo
# EN: BIG ROUND EYE PATCHES with fur tufts
for side, ex in (("R", 0.35), ("L", -0.35)):
    sph(f"P_Mancha_{side}",    0.30, (ex,         -1.08, 2.60), M_NEGRO, sc=(1.22, 0.45, 1.32))
    sph(f"P_ManchaFur_{side}", 0.22, (ex*1.18,    -0.98, 2.72), M_NEGRO, sc=(1.0,  0.35, 0.82), sd=1)
    sph(f"P_ManchaFur2_{side}",0.16, (ex*0.75,    -0.95, 2.52), M_NEGRO, sc=(1.0,  0.30, 0.75), sd=1)

# ES: OJOS lindos dentro de las manchas
# EN: Cute eyes inside the patches
for side, ex in (("R", 0.35), ("L", -0.35)):
    sph(f"P_OjoB_{side}",   0.155, (ex,           -1.16, 2.60), M_OJO_B,  sc=(1.0, 0.36, 1.05))
    sph(f"P_Iris_{side}",   0.118, (ex,           -1.21, 2.60), M_IRIS,   sc=(1.0, 0.22, 1.05))
    sph(f"P_Pupila_{side}", 0.072, (ex,           -1.25, 2.60), M_PUPILA, sc=(0.8, 0.14, 1.10))
    sph(f"P_Brillo_{side}", 0.028, (ex+0.05,      -1.26, 2.67), M_BRILLO)

# ES: NARIZ pequeña y tierna / EN: Small cute nose
sph("P_Nariz", 0.092, (0, -1.18, 2.46), M_NARIZ, sc=(1.3, 0.55, 0.80))

# ES: MEJILLAS ROSADAS (kawaii essential)
# EN: PINK CHEEKS (kawaii essential)
for side, ex in (("R", 0.52), ("L", -0.52)):
    sph(f"P_Mejilla_{side}", 0.19, (ex, -1.05, 2.42), M_ROSA, sc=(1.22, 0.38, 0.88))

# ES: OREJAS negras con interior gris y mechón de pelo
# EN: BLACK EARS with grey interior and fur tuft
for side, ex in (("R", 0.72), ("L", -0.72)):
    sph(f"P_OrejaExt_{side}", 0.28, (ex,      -0.05, 3.00), M_NEGRO, sc=(0.90, 0.65, 1.00))
    sph(f"P_OrejaInt_{side}", 0.18, (ex,      -0.12, 3.00), M_GRIS,  sc=(0.68, 0.45, 0.78))
    sph(f"P_OrejaFur_{side}", 0.14, (ex*1.08,  0.02, 3.14), M_NEGRO, sc=(0.65, 0.38, 0.72), sd=1)

# ES: BRAZOS rechonchos negros / EN: Chubby black arms
for side, ax, ry in (("R",  1.00, -0.35), ("L", -1.00,  0.35)):
    sph(f"P_HombroFur_{side}", 0.28, (ax*0.78,  0.20, 1.82), M_NEGRO, sc=(1.0, 0.70, 0.88), sd=1)
    cyl(f"P_Brazo_{side}",     0.24, 0.72, (ax, 0.15, 1.55), M_NEGRO, rot=(0, ry, 0))
    sph(f"P_Mano_{side}",      0.22, (ax*1.12, 0.12, 1.18), M_BLANCO, sc=(1.1, 0.80, 1.0))
    for gi, goff in enumerate((-0.10, 0.00, 0.10)):
        cone(f"P_Dedo_{side}_{gi}", 0.058, 0.010, 0.18,
             (ax*1.20 + goff*(0.5 if ax>0 else -0.5), -0.05, 1.05), M_NEGRO)

# ES: PATAS traseras con pelaje en los pies
# EN: BACK LEGS with fur on the feet
for side, lx in (("R", 0.58), ("L", -0.58)):
    cyl(f"P_Pierna_{side}",  0.30, 0.65, (lx,  0.20, 0.48), M_NEGRO)
    sph(f"P_Pie_{side}",     0.28, (lx,  0.35, 0.10), M_NEGRO, sc=(1.0, 1.45, 0.62))
    sph(f"P_PieFur_{side}",  0.20, (lx,  0.52, 0.08), M_BLANCO, sc=(0.88, 0.70, 0.50), sd=1)
    # ES: Dedos del pie / EN: Toe pads
    for gi, goff in enumerate((-0.10, 0.00, 0.10)):
        sph(f"P_Dedo_Pie_{side}_{gi}", 0.06, (lx+goff, 0.58, 0.06), M_NEGRO, sc=(1,0.6,0.6), sd=0)

# ── 5. Armadura / Armature ─────────────────────────────────────────
bpy.ops.object.select_all(action="DESELECT")
bpy.ops.object.armature_add(enter_editmode=True, location=(0,0,0))
arm_obj = bpy.context.active_object
arm_obj.name = "Panda_Armature"
arm = arm_obj.data; arm.name = "Panda_Arm"
for b in list(arm.edit_bones): arm.edit_bones.remove(b)

def bone(name, head, tail, parent=None):
    b = arm.edit_bones.new(name)
    b.head=head; b.tail=tail
    if parent: b.parent=arm.edit_bones[parent]; b.use_connect=False
    return b

bone("Root",  (0,  0.00,0.00),(0,  0.00,0.30))
bone("Body",  (0,  0.00,0.90),(0,  0.00,1.70),"Root")
bone("Head",  (0, -0.15,1.90),(0, -0.25,2.72),"Body")
bone("EarR",  ( 0.72,-0.02,2.70),( 0.70,-0.05,3.06),"Head")
bone("EarL",  (-0.72,-0.02,2.70),(-0.70,-0.05,3.06),"Head")
bone("ArmR",  ( 0.72, 0.12,1.72),( 1.05, 0.10,1.30),"Body")
bone("HandR", ( 1.05, 0.10,1.30),( 1.18, 0.08,0.98),"ArmR")
bone("ArmL",  (-0.72, 0.12,1.72),(-1.05, 0.10,1.30),"Body")
bone("HandL", (-1.05, 0.10,1.30),(-1.18, 0.08,0.98),"ArmL")
bone("LegR",  ( 0.58, 0.18,0.80),( 0.58, 0.32,0.22),"Body")
bone("LegL",  (-0.58, 0.18,0.80),(-0.58, 0.32,0.22),"Body")
bpy.ops.object.mode_set(mode="OBJECT")

# ── 6. Parentar / Parent ───────────────────────────────────────────
bpy.ops.object.select_all(action="DESELECT")
for p in parts: p.select_set(True)
arm_obj.select_set(True)
bpy.context.view_layer.objects.active = arm_obj
bpy.ops.object.parent_set(type="ARMATURE_AUTO")

# ── 7. Animaciones / Animations ────────────────────────────────────
bpy.context.view_layer.objects.active = arm_obj
bpy.ops.object.mode_set(mode="POSE")
scene = bpy.context.scene; scene.render.fps = FPS

def kfr(bn, e, f):
    pb = arm_obj.pose.bones.get(bn)
    if pb: pb.rotation_mode="XYZ"; pb.rotation_euler=e; pb.keyframe_insert("rotation_euler",frame=f)

def kfl(bn, l, f):
    pb = arm_obj.pose.bones.get(bn)
    if pb: pb.location=l; pb.keyframe_insert("location",frame=f)

def clr():
    for pb in arm_obj.pose.bones: pb.rotation_mode="XYZ"; pb.rotation_euler=(0,0,0); pb.location=(0,0,0)

arm_obj.animation_data_create(); acts={}

# IDLE – respiración suave + cabeza balanceante
a=bpy.data.actions.new("Idle"); acts["Idle"]=a; arm_obj.animation_data.action=a; clr()
for f,z in ((1,0.000),(14,0.030),(28,0.000),(42,0.030),(48,0.000)): kfl("Body",(0,0,z),f)
for f,rz in ((1,0.00),(16,0.06),(32,-0.06),(48,0.00)): kfr("Head",(0,0,rz),f)

# LISTEN – cabeza ladeada + orejas atentas
a=bpy.data.actions.new("Listen"); acts["Listen"]=a; arm_obj.animation_data.action=a; clr()
for f,rz in ((1,0.00),(10,0.40),(36,0.40),(48,0.00)): kfr("Head",(0,0,rz),f)
for f,rx in ((1,0.00),(10,-0.25),(36,-0.25),(48,0.00)):
    kfr("EarR",(rx,0, 0.12),f); kfr("EarL",(rx,0,-0.12),f)

# THINK – cabeza baja + brazo a la mejilla
a=bpy.data.actions.new("Think"); acts["Think"]=a; arm_obj.animation_data.action=a; clr()
for f,rx in ((1,0.00),(12,0.38),(30,0.38),(44,0.00),(48,0.00)): kfr("Head",(rx,0,0),f)
for f,rx in ((1,0.00),(12,-0.55),(30,-0.55),(44,0.00),(48,0.00)): kfr("ArmR",(rx,0,0),f)

# SPEAK – pulso de habla + orejas tiemblan
a=bpy.data.actions.new("Speak"); acts["Speak"]=a; arm_obj.animation_data.action=a; clr()
for i,f in enumerate([1,8,16,24,32,40,48]):
    kfl("Head",(0,0,0.030 if i%2==0 else -0.005),f)
for f,rz in ((1,0.00),(10,0.10),(20,-0.10),(30,0.10),(40,-0.08),(48,0.00)):
    kfr("EarR",(0,0, rz),f); kfr("EarL",(0,0,-rz),f)

# HAPPY – salto + brazos arriba en V
a=bpy.data.actions.new("Happy"); acts["Happy"]=a; arm_obj.animation_data.action=a; clr()
for f,z in ((1,0.00),(8,0.35),(15,0.00),(22,0.22),(30,0.00),(38,0.08),(48,0.00)): kfl("Root",(0,0,z),f)
for f,rx in ((1,0.00),(8,-0.65),(18,0.00),(26,-0.50),(36,0.00),(48,0.00)):
    kfr("ArmR",(rx,0, 0.20),f); kfr("ArmL",(rx,0,-0.20),f)

bpy.ops.object.mode_set(mode="OBJECT")

# ── 8. NLA ─────────────────────────────────────────────────────────
arm_obj.animation_data_create()
for name, action in acts.items():
    t=arm_obj.animation_data.nla_tracks.new(); t.name=name
    s=t.strips.new(name,1,action)
    s.action_frame_start=1; s.action_frame_end=CLIP_FRAMES
    s.frame_start=1;         s.frame_end=CLIP_FRAMES
arm_obj.animation_data.action=None

# ── 9. Export GLB ──────────────────────────────────────────────────
scene.frame_start=1; scene.frame_end=CLIP_FRAMES
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(
    filepath=output_path, export_format="GLB",
    export_apply=True, export_animations=True,
    export_nla_strips=True, export_anim_mode="NLA_TRACKS",
    export_skins=True, export_morph=True,
)
print(f"\n✅ Panda cute exportado → {output_path}")
print("   NLA: Idle, Listen, Think, Speak, Happy")


