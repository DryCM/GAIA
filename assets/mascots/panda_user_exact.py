import bpy
import os

def crear_material(nombre, color):
    mat = bpy.data.materials.new(name=nombre)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs['Base Color'].default_value = color
    return mat

# Limpiar escena
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Colores
blanco = crear_material("PandaBlanco", (1, 1, 1, 1))
negro = crear_material("PandaNegro", (0.02, 0.02, 0.02, 1))

# Cuerpo (Esfera blanca)
bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=(0, 0, 1))
cuerpo = bpy.context.active_object
cuerpo.data.materials.append(blanco)

# Cabeza (Esfera blanca mas pequena)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.8, location=(0, 0, 2.3))
cabeza = bpy.context.active_object
cabeza.data.materials.append(blanco)

# Orejas (Esferas negras)
pos_orejas = [(0.5, 0.4, 2.9), (-0.5, 0.4, 2.9)]
for pos in pos_orejas:
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.2, location=pos)
    bpy.context.active_object.data.materials.append(negro)

# Ojos/Manchas (Esferas negras achatadas)
pos_ojos = [(0.3, -0.65, 2.4), (-0.3, -0.65, 2.4)]
for pos in pos_ojos:
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.15, location=pos)
    ojo = bpy.context.active_object
    ojo.scale = (1, 0.5, 1)
    ojo.data.materials.append(negro)

# Brazos (Cilindros negros)
pos_brazos = [(0.9, 0, 1.5), (-0.9, 0, 1.5)]
for pos in pos_brazos:
    bpy.ops.mesh.primitive_cylinder_add(radius=0.2, depth=1, location=pos)
    brazo = bpy.context.active_object
    brazo.rotation_euler[1] = 0.5 if pos[0] > 0 else -0.5
    brazo.data.materials.append(negro)

# Piernas (Cilindros cortos negros)
pos_piernas = [(0.5, 0, 0.3), (-0.5, 0, 0.3)]
for pos in pos_piernas:
    bpy.ops.mesh.primitive_cylinder_add(radius=0.25, depth=0.7, location=pos)
    bpy.context.active_object.data.materials.append(negro)

# Suavizar todo
for obj in bpy.data.objects:
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.shade_smooth()

# Exportar para la app
script_dir = os.path.dirname(os.path.abspath(__file__))
output_path = os.path.join(script_dir, "panda.glb")

bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    export_apply=True,
    export_animations=True,
)

print(f"Panda exportado en: {output_path}")