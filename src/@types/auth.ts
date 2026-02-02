export type SignInCredential =
    | {
          username: string
          password: string
      }
    | { id: string }

export type SignInResponse = {
    token: string
    user: {
        username: string
        authority: string[]
        name: string
        email: string
    }
}

export type ResetPassword = {
    password: string
}
