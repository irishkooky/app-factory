declare module 'cloudflare:workers' {
  export const env: {
    DASHSCOPE_API_KEY?: string
    DASHSCOPE_WORKSPACE_ID?: string
    DASHSCOPE_REGION?: string
  }
}
