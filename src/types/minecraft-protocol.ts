// Package official index.d.ts missing emit events
// This adds the used ones in this project
declare module 'minecraft-protocol' {
  export interface Client {
    emit: (message: 'connect') => void
  }
}
