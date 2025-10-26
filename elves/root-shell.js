import { Elf } from '@silly/types'

const $ = Elf('root-shell')

$.draw(() => {
  return `<ur-shell src="/app/hello-elvish?elf=generic-park"></ur-shell>`
})

Elf($)
