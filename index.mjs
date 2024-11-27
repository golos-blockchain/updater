
import express from 'express'
import fs from 'fs'
import git from 'git-rev-sync'
import semver from 'semver'
import serveIndex from 'serve-index'

import { createHtmlRender } from './render.mjs'

const app = express()

app.use(express.json())

app.use('/', express.static('files'), serveIndex('files', {
    view: 'details',
    icons: true,
    template: createHtmlRender()
}))

const downloadTmpl = fs.readFileSync('template.html', 'utf-8')

function listApps() {
    let apps = {}
    const dirs = fs.readdirSync('files', { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
    for (const dir of dirs) {
        const parts = dir.split('-')
        if (parts.length > 1) {
            const platform = parts.pop()
            const name = parts.join('-')
            if (apps[name]) {
                apps[name].platforms.push(platform)
            } else {
                apps[name] = {
                    platforms: [platform]
                }
            }
        } else {
            const name = parts[0]
            if (!apps[name]) {
                apps[name] = {}
            }
        }
    }
    return apps
}

function getAppVersions(name, platform, after = null, latest = false) {
    const apps = listApps()
    const app = apps[name]
    if (!app) {
        throw new Error('No such app: '+  name)
    }
    if (platform && (!app.platforms || !app.platforms.includes(platform))) {
        throw new Error(name + ' app has not platform: ' + platform)
    }

    const versions = {}
    let latestVersion = {}
    const path = 'files/' + name + (platform ? '-' + platform : '')
    const files = fs.readdirSync(path, { withFileTypes: true })
        .filter(dirent => dirent.isFile())
        .map(dirent => dirent.name)
    for (let file of files) {
        const parts = file.split('-')
        if (parts.length < 2) continue
        const verExt = parts.pop()

        const verParts = verExt.split('.')
        const ext = verParts.pop()
        let curVer = verParts.join('.')
        if (verParts.length === 2) {
            curVer += '.0'
        }
        if (after && !semver.gt(curVer, after)) {
            continue
        }
        if (!versions[curVer]) {
            versions[curVer] = {}
        }
        const url = name + (platform ? '/' + platform : '') + '/' + curVer
        if (ext === 'txt') {
            versions[curVer].txt = file
            versions[curVer].txt_url = '/api/txt/' + url
        } else {
            versions[curVer].exe = file
            versions[curVer].exe_url = '/api/exe/' + url
        }
        versions[curVer].html_url = '/api/html/' + url
        latestVersion = { [curVer]: versions[curVer] }
    }
    if (latest) {
        return latestVersion
    }
    return versions
}

const tryCatch = (controller) => async (req, res, next) => {
    try {
        await controller(req, res)
    } catch (err) {
        return next(err)
    }
}

app.get('/api', tryCatch(async (req, res) => {
    let version
    try {
        version = git.short('.')
    } catch (err) {
        version = 'undefined'
        console.error('git-rev-sync', err)
    }
    let arr = []
    const apps = listApps()
    for (const [ name, obj ] of Object.entries(apps)) {
        if (obj.platforms) {
            for (const platform of obj.platforms) {
                arr.push({
                    name: name,
                    platform,
                    url: '/api/' + name + '/' + platform
                })
            }
        } else {
            arr.push({
                 name,
                 url: '/api/' + name
            })
        }
    }
    res.json({
        status: 'ok',
        version,
        apps: arr
    })
}))

app.get('/api/:app/:platform?', tryCatch(async (req, res) => {
    const { app, platform } = req.params
    const { after, } = req.query
    const latest = 'latest' in req.query
    const data = getAppVersions(app, platform, after, latest)
    res.json({
        status: 'ok',
        data
    })
}))

function renderHtml(res, data, app, platform, version) {
    let htmlStr = downloadTmpl
    htmlStr = htmlStr.split('{$TITLE}').join('GOLOS ' + app + ' - ' + version)
    if (data[version].exe_url) {
        htmlStr = htmlStr.split('{$EXE_URL}').join(data[version].exe_url)
    }
    if (data[version].txt_url) {
        htmlStr = htmlStr.split('{$TXT_URL}').join(data[version].txt_url)
    } else {
        htmlStr = htmlStr.split('{$TXT_URL}').join('')
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(htmlStr)
}

async function getSpecific(req, res, what) {
    const { app, platform, version} = req.params
    const data = getAppVersions(app, platform)
    const dir = '/' + app + (platform ? '-' + platform : '')
    if (version !== 'latest') {
        if (data[version]) {
            if (data[version][what])  {
                res.redirect(307, dir + '/' + data[version][what])
            } else if (what === 'html' && data[version].html_url) {
                renderHtml(res, data, app, platform, version)
            } else {
                throw new Error('No such ' + what + ' ' + version + ' of ' + app + '-' + platform)
            }
        } else {
            throw new Error('No such version ' + version + ' of ' + app + '-' + platform)
        }
    } else {
        const entries = Object.entries(data)
        if (!entries.length) {
            throw new Error('No latest ' + what + ' of ' + app + '-' + platform)
        }
        if (what === 'html') {
            res.redirect(307, entries[entries.length - 1][1].html_url)
            return
        }
        res.redirect(307, dir + '/' + entries[entries.length - 1][1][what])
    }
}

app.get('/api/exe/:app/:version', tryCatch(async (req, res) => {
    await getSpecific(req, res, 'exe')
}))
app.get('/api/exe/:app/:platform/:version', tryCatch(async (req, res) => {
    await getSpecific(req, res, 'exe')
}))

app.get('/api/txt/:app/:version', tryCatch(async (req, res) => {
    await getSpecific(req, res, 'txt')
}))
app.get('/api/txt/:app/:platform/:version', tryCatch(async (req, res) => {
    await getSpecific(req, res, 'txt')
}))

app.get('/api/html/:app/:version', tryCatch(async (req, res) => {
    await getSpecific(req, res, 'html')
}))
app.get('/api/html/:app/:platform/:version', tryCatch(async (req, res) => {
    await getSpecific(req, res, 'html')
}))

app.use((err, req, res, next) => {
    console.error(err)
    res.status(400).json({
        status: 'err',
        error: err.message || err
    })
})

const PORT = 3000
app.listen(PORT)
console.log('Listening', PORT)
