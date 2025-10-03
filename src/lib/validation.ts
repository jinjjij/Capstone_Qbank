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