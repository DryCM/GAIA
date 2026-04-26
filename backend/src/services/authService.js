/* ================================================================
   GaIA Auth Service / Servicio de autenticación
   ES: Gestiona registro, login y verificación de JWT.
       Almacena usuarios con contraseñas hasheadas en data/users.json.
       Roles: "normal" (usuario estándar) | "admin" (líder con
       privilegios extendidos y trato especial de la IA).
   EN: Handles registration, login and JWT verification.
       Stores users with hashed passwords in data/users.json.
       Roles: "normal" (standard user) | "admin" (leader with
       extended privileges and special AI treatment).
   ================================================================ */

import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.resolve(__dirname, "../../data/users.json");

// ES: Número de rondas de salt para bcrypt. 10 es el balance
//     recomendado entre seguridad y rendimiento en Node.js.
// EN: Number of salt rounds for bcrypt. 10 is the recommended
//     balance between security and performance in Node.js.
const SALT_ROUNDS = 10;

// ES: Devuelve el secreto JWT desde la variable de entorno.
//     Emite una advertencia si no está configurado para que
//     el desarrollador lo añada al .env antes de producción.
// EN: Returns the JWT secret from the environment variable.
//     Emits a warning if not set so the developer adds it
//     to .env before going to production.
function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    console.warn(
      "[GaIA Auth] JWT_SECRET no configurado. " +
      "Usando secreto temporal. Añade JWT_SECRET al .env antes de producción."
    );
    return "gaia-dev-secret-insecure-changeme";
  }
  return secret;
}

// ES: Carga el mapa de usuarios desde el archivo JSON.
//     Devuelve un objeto vacío si el archivo no existe o está corrupto.
// EN: Loads the user map from the JSON file.
//     Returns an empty object if the file is missing or corrupted.
function loadUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) return {};
    const raw = fs.readFileSync(USERS_FILE, "utf8");
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

// ES: Persiste el mapa de usuarios en el archivo JSON.
// EN: Persists the user map to the JSON file.
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

// ES: Registra un nuevo usuario.
//     Si adminCode coincide con ADMIN_INVITE_CODE del .env,
//     se asigna el rol "admin"; de lo contrario, "normal".
//     Devuelve { token, userId, username, role }.
// EN: Registers a new user.
//     If adminCode matches ADMIN_INVITE_CODE from .env,
//     the role "admin" is assigned; otherwise "normal".
//     Returns { token, userId, username, role }.
async function registerUser(username, password, adminCode) {
  const users = loadUsers();
  const lowerUsername = username.toLowerCase();

  if (users[lowerUsername]) {
    const error = new Error("El nombre de usuario ya existe.");
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcryptjs.hash(password, SALT_ROUNDS);

  const adminInviteCode = process.env.ADMIN_INVITE_CODE?.trim();
  const role =
    adminCode && adminInviteCode && adminCode === adminInviteCode ? "admin" : "normal";

  const userId = `u-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  users[lowerUsername] = {
    userId,
    username: lowerUsername,
    passwordHash,
    role,
    createdAt: new Date().toISOString(),
  };

  saveUsers(users);

  const token = jwt.sign(
    { userId, username: lowerUsername, role },
    getJwtSecret(),
    { expiresIn: "30d" }
  );

  return { token, userId, username: lowerUsername, role };
}

// ES: Verifica las credenciales y devuelve un JWT si son correctas.
//     Lanza 401 si el usuario no existe o la contraseña es incorrecta.
// EN: Verifies credentials and returns a JWT if they are correct.
//     Throws 401 if the user does not exist or the password is wrong.
async function loginUser(username, password) {
  const users = loadUsers();
  const lowerUsername = username.toLowerCase();
  const user = users[lowerUsername];

  if (!user) {
    const error = new Error("Usuario o contraseña incorrectos.");
    error.statusCode = 401;
    throw error;
  }

  const isValid = await bcryptjs.compare(password, user.passwordHash);
  if (!isValid) {
    const error = new Error("Usuario o contraseña incorrectos.");
    error.statusCode = 401;
    throw error;
  }

  const token = jwt.sign(
    { userId: user.userId, username: user.username, role: user.role },
    getJwtSecret(),
    { expiresIn: "30d" }
  );

  return { token, userId: user.userId, username: user.username, role: user.role };
}

// ES: Verifica y decodifica un JWT. Devuelve el payload
//     o null si el token es inválido o ha expirado.
// EN: Verifies and decodes a JWT. Returns the payload
//     or null if the token is invalid or has expired.
function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}

export { registerUser, loginUser, verifyToken };
