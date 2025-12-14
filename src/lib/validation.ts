// 회원가입 및 비밀번호 변경 시 입력값 검증용 Zod 스키마 정의


import {z} from "zod";


export const SignUpSchema = z.object({
    email: z.preprocess(
        (val) => (typeof val == "string" ? val.trim().toLowerCase(): val),
        z.email()
    ),
    password: z.string().min(8).max(72)
});


export const ChangePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(72)
})


export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isOptionalString(value: unknown): value is string | undefined | null {
  return (
    value === undefined ||
    value === null ||
    typeof value === "string"
  );
}

export type Visibility = "PUBLIC" | "PRIVATE";

export function isVisibility(value: unknown): value is Visibility {
  return value === "PUBLIC" || value === "PRIVATE";
}
