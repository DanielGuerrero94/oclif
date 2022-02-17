import {Command, Flags} from '@oclif/core'
import * as qq from 'qqjs'

import * as Tarballs from '../../tarballs'

export default class PackTarballs extends Command {
  static description = `packages oclif CLI into tarballs

This can be used to create oclif CLIs that use the system node or that come preloaded with a node binary.
`

  static flags = {
    root: Flags.string({char: 'r', description: 'path to oclif CLI root', default: '.', required: true}),
    targets: Flags.string({char: 't', description: 'comma-separated targets to pack (e.g.: linux-arm,win32-x64)'}),
    xz: Flags.boolean({description: 'also build xz', allowNo: true}),
    tarball: Flags.string({char: 'l', description: 'optionally specify a path to a tarball already generated by NPM', required: false}),
  }

  async run(): Promise<void> {
    const prevCwd = qq.cwd()
    if (process.platform === 'win32') throw new Error('pack does not function on windows')
    const {flags} = await this.parse(PackTarballs)
    const buildConfig = await Tarballs.buildConfig(flags.root, {xz: flags.xz, targets: flags?.targets?.split(',')})
    if (buildConfig.targets.length === 0) {
      throw new Error('Please specify one or more valid targets.')
    }

    await Tarballs.build(buildConfig, {
      tarball: flags.tarball,
    })
    qq.cd(prevCwd)
  }
}
