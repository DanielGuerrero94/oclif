import {Command, flags} from '@oclif/command'
import {ArchTypes, PlatformTypes} from '@oclif/config'
import * as qq from 'qqjs'

import aws from '../../aws'
import {log} from '../../log'
import * as Tarballs from '../../tarballs'
import {commitAWSDir, commitSHA} from '../../publish-util'

export default class Publish extends Command {
  static hidden = true

  static description = `publish an oclif CLI to S3

"aws-sdk" will need to be installed as a devDependency to publish.
`

  static flags = {
    root: flags.string({char: 'r', description: 'path to oclif CLI root', default: '.', required: true}),
    targets: flags.string({char: 't', description: 'comma-separated targets to pack (e.g.: linux-arm,win32-x64)'}),
  }

  buildConfig!: Tarballs.IConfig

  async run() {
    const {flags} = this.parse(Publish)
    if (process.platform === 'win32') throw new Error('publish does not function on windows')
    const targetOpts = flags.targets ? flags.targets.split(',') : undefined
    this.buildConfig = await Tarballs.buildConfig(flags.root, {targets: targetOpts})
    const {s3Config, targets, dist, version, config} = this.buildConfig
    const bin = this.buildConfig.config.pjson.oclif.bin
    if (!await qq.exists(dist(config.s3Key('versioned', {ext: '.tar.gz'})))) this.error('run "oclif-dev pack" before publishing')
    const S3Options = {
      Bucket: s3Config.bucket!,
      ACL: s3Config.acl || 'public-read',
    }

    const uploadTarball = async (options?: {platform: PlatformTypes; arch: ArchTypes}) => {
      const TarballS3Options = {...S3Options, CacheControl: 'max-age=604800'}
      const releaseTarballs = async (ext: '.tar.gz' | '.tar.xz') => {
        const s3Key = (): string => {
          const template = '<%- root %><%- bin %>-<%- platform %>-<%- arch %><%- ext %>'
          const s3Root = commitAWSDir(version)
          const _ = require('lodash')
          return _.template(template)({...options, ext, bin, root: s3Root})
        }

        const versioned = config.s3Key('versioned', ext, options)
        const key = s3Key()
        console.dir(this.buildConfig.channel)
        console.dir(key)
        await aws.s3.uploadFile(dist(versioned), {...TarballS3Options, ContentType: 'application/gzip', Key: key})
      }
      await releaseTarballs('.tar.gz')
    }
    if (targets.length > 0) log('uploading targets')
    // eslint-disable-next-line no-await-in-loop
    for (const target of targets) await uploadTarball(target)
    log(`uploaded ${version}-${commitSHA()} targets`)
  }
}
