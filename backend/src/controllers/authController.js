/* ================================================================
   GaIA Auth Controller / Controlador de autenticación
   ES: Maneja los endpoints de registro y login de usuarios.
   EN: Handles the user registration and login endpoints.
   ================================================================ */

import { registerUser, loginUser } from "../services/authService.js";

// ES: Expresión regular para validar nombres de usuario:
//     3–32 caracteres alfanuméricos, guión bajo o guión.
// EN: Regex to validate usernames:
//     3–32 alphanumeric characters, underscore or hyphen.
const USERNAME_REGEX = /^[a-zA-Z0-9_\-]{3,32}$/;
const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_MAX_LENGTH = 128;

// ES: Registra un nuevo usuario. Acepta un código de admin opcional
//     para obtener el rol de administrador.
// EN: Registers a new user. Accepts an optional admin code
//     to obtain the administrator role.
async function register(req, res) {
  try {
    const { username, password, adminCode } = req.body ?? {};

    if (typeof username !== "string" || !USERNAME_REGEX.test(username)) {
      return res.status(400).json({
        error: "Nombre de usuario no válido. Usa entre 3 y 32 caracteres (letras, números, _ o -).",
      });
    }

    if (
      typeof password !== "string" ||
      password.length < PASSWORD_MIN_LENGTH ||
      password.length > PASSWORD_MAX_LENGTH
    ) {
      return res.status(400).json({
        error: `La contraseña debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres.`,
      });
    }

    const result = await registerUser(
      username,
      password,
      typeof adminCode === "string" ? adminCode.trim() : ""
    );

    return res.status(201).json(result);
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Error al registrar usuario." });
  }
}

// ES: Autentica a un usuario existente y devuelve un JWT.
// EN: Authenticates an existing user and returns a JWT.
async function login(req, res) {
  try {
    const { username, password } = req.body ?? {};

    if (typeof username !== "string" || !username.trim()) {
      return res.status(400).json({ error: "Falta el nombre de usuario." });
    }

    if (typeof password !== "string" || !password) {
      return res.status(400).json({ error: "Falta la contraseña." });
    }

    const result = await loginUser(username.trim(), password);
    return res.json(result);
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json({ error: error.message || "Error al iniciar sesión." });
  }
}

export { register, login };
