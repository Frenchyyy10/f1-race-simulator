import { registerOTel } from '@vercel/otel'

export function register() {
  registerOTel({ serviceName: 'f1-race-simulator' })
}
