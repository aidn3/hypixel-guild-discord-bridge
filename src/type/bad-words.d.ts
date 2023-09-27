declare module 'bad-words' {
  export = class {
    constructor(options?: BadWordsOptions)

    clean: (text: string) => string
    removeWords: (...arguments_: string[]) => void
  }

  export interface BadWordsOptions {
    emptyList?: boolean
    list?: string[]
    placeHolder?: string
    regex?: string
    replaceRegex?: string
  }
}
