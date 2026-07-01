import assert from "node:assert/strict";
import test from "node:test";
import {
  CREATE_USER_PASSWORD_MESSAGE,
  CREATE_USER_PASSWORD_MAX_MESSAGE,
  PASSWORD_CONFIRM_MESSAGE,
  createUserSchema,
  resetUserPasswordSchema,
} from "../../src/lib/admin-users";

const validInput = {
  name: "Test Juridico",
  username: "test.juridico01",
  email: "test.juridico01@example.com",
  role: "juridico",
  password: "Temporal123!",
  passwordConfirm: "Temporal123!",
};

test("requiere email valido y contrasena de al menos seis caracteres", () => {
  const result = createUserSchema.safeParse({
    ...validInput,
    email: "",
    password: "1234",
  });

  assert.equal(result.success, false);
  const errors = result.error.flatten().fieldErrors;
  assert.ok(errors.email?.includes("El email es obligatorio."));
  assert.ok(errors.password?.includes(CREATE_USER_PASSWORD_MESSAGE));
});

test("rechaza roles invalidos y contrasenas demasiado largas", () => {
  const result = createUserSchema.safeParse({
    ...validInput,
    role: "juridico-inexistente",
    password: "a".repeat(73),
  });

  assert.equal(result.success, false);
  const errors = result.error.flatten().fieldErrors;
  assert.ok(errors.role?.includes("Selecciona un rol valido."));
  assert.ok(errors.password?.includes(CREATE_USER_PASSWORD_MAX_MESSAGE));
});

test("acepta caracteres especiales y normaliza el email a minusculas", () => {
  const result = createUserSchema.safeParse({
    ...validInput,
    email: " Test.Juridico+01@Example.COM ",
    password: "123456!",
    passwordConfirm: "123456!",
  });

  assert.equal(result.success, true);
  assert.equal(result.data.email, "test.juridico+01@example.com");
});

test("requiere repetir la misma contrasena al crear o restablecer", () => {
  const createResult = createUserSchema.safeParse({
    ...validInput,
    password: "Temporal123!",
    passwordConfirm: "Temporal124!",
  });
  const resetResult = resetUserPasswordSchema.safeParse({
    password: "Temporal123!",
    passwordConfirm: "Temporal124!",
  });

  assert.equal(createResult.success, false);
  assert.equal(resetResult.success, false);
  assert.ok(createResult.error.flatten().fieldErrors.passwordConfirm?.includes(PASSWORD_CONFIRM_MESSAGE));
  assert.ok(resetResult.error.flatten().fieldErrors.passwordConfirm?.includes(PASSWORD_CONFIRM_MESSAGE));
});
