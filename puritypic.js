const { app, BrowserWindow, dialog } = require('electron');

const path = require("path");
const fs = require("fs");

// Database
const Database = require("../../modules/database");
const db = new Database();

// UtilNode
const UtilNode = require("../../modules/utilnode");
const utilnode = new UtilNode({
    electron: { dialog, BrowserWindow },
    database: db
});

// package
let pakContainer = require("../../package.json");
let pakApp = require("./package.json");

// Appdata
const appDataPath = app.getPath('appData');

// imgminify
const imgminify = require("./app/modules/imgminify");

// ruta de la base de datos
async function getCog(type) {
    const fileCog = path.join(appDataPath, pakContainer.name, "apps", pakApp.name, "settings", "app.json");
    const fileTextCog = await utilnode.fsRead(fileCog);
    let cog = utilnode.jsonParse(fileTextCog).compression;

    if (type == "ruta") {
        let rutaDB;

        if (cog.db == "appdata") {
            rutaDB = app.getPath('appData');
        } else if (cog.db == "documents") {
            rutaDB = app.getPath('documents');
        } else if (cog.db == "pictures") {
            rutaDB = app.getPath('pictures');
        }
        rutaDB = path.normalize(rutaDB);

        return path.join(rutaDB);
    } else if (type == "level") {
        return parseInt(cog.level);
    }
}

(async () => {

    // verificar la configuracon
    const fileCog = path.join(appDataPath, pakContainer.name, "apps", pakApp.name, "settings", "app.json");
    if (!fs.existsSync(fileCog)) {
        try {
            const pathApp = `${pakContainer.name}/apps/${pakApp.name}/settings`;
            await utilnode.createFolderRecursive(path.normalize(app.getPath('appData')), pathApp);
            let defaultcog = {
                compression: {
                    db: "appdata",
                    level: 80
                }
            };

            await utilnode.fsWrite(fileCog, JSON.stringify(defaultcog, null, 2));

        } catch (error) {

        }
    } else {
        const pathApp = `${pakContainer.name}/apps/${pakApp.name}`;
        await utilnode.createFolderRecursive(path.normalize(await getCog("ruta")), pathApp);
    }

    // Base de Datos
    const data_db = await db.db("imgminify", path.join(await getCog("ruta"), pakContainer.name, "apps", pakApp.name, "imgminify.sqlite"), true);
    if (data_db) {
        await utilnode.newTable("imgminify", "imagens", [
            { name: 'id', type: 'INTEGER PRIMARY KEY' },
            { name: 'name', type: 'TEXT' },
            { name: 'extension', type: 'TEXT' },
            { name: 'imageblob', type: 'BLOB' },
        ], false);
    };
})()

// libraries
const lib = require("../../modules/util-libraries");

const routes = [
    {
        method: 'get',
        path: '/',
        handler: (req, res) => {
            // render
            res.render(path.join(__dirname, "app", "views", "index"));
        }
    },
    {
        method: 'get',
        path: '/cog',
        handler: async (req, res) => {
            const fileCog = path.join(appDataPath, pakContainer.name, "apps", pakApp.name, "settings", "app.json");
            let cog = {};

            try {
                const fileTextCog = await utilnode.fsRead(fileCog);
                cog = utilnode.jsonParse(fileTextCog).compression;
            } catch (error) {
                cog = {
                    db: "appdata",
                    level: 80
                }
            }

            // render
            res.render(path.join(__dirname, "app", "views", "cog"), {
                cog
            });
        }
    },
    {
        method: 'post',
        path: '/save-cog',
        handler: async (req, res) => {
            let value = req.body;
            const fileCog = path.join(appDataPath, pakContainer.name, "apps", pakApp.name, "settings", "app.json");
            try {
                const fileTextCog = await utilnode.fsRead(fileCog);
                let data = utilnode.jsonParse(fileTextCog);
                data["compression"] = {
                    ...data.compression,
                    ...value
                }

                await utilnode.fsWrite(fileCog, JSON.stringify(data, null, 2));

            } catch (error) {

            }

            res.end();
        }
    },
    {
        method: 'get',
        path: '/results',
        handler: async (req, res) => {
            // render
            res.render(path.join(__dirname, "app", "views", "results"));
        }
    },
    {
        method: 'post',
        path: '/results-img',
        handler: async (req, res) => {
            try {
                const results = await utilnode.getTable("imgminify", "imagens", ["desc"]);

                // Usar Promise.all para procesar imágenes de forma asíncrona
                await Promise.all(results.map(async (img) => {
                    const imageBuffer = Buffer.from(img.imageblob, 'hex');
                    img.imageblob = imageBuffer.toString('base64');
                }));
                // Enviar la respuesta cuando todas las operaciones asíncronas estén completas
                res.send(results);
            } catch (error) {
                console.log(error);
                res.status(500).send('Error en el servidor');
            }
        }
    },
    {
        method: 'post',
        path: '/upload-to-db',
        handler: async (req, res) => {
            let body = req.body;
            try {

                const inputBuffer = fs.readFileSync(body.path);
                const result = await imgminify.convertAndOptimizeImage(inputBuffer, { quality: await getCog("level") });
                if (result) {
                    let view = await utilnode.whereDB('imgminify', 'imagens', { name: `${body.name}` });
                    if (view.length > 0) {
                        let updateData = {
                            name: body.name,
                            extension: body.extension,
                            imageblob: result
                        };
                        await utilnode.updateData('imgminify', 'imagens', updateData, `name = '${body.name}'`);
                    } else {
                        await utilnode.insertData("imgminify", "imagens", {
                            name: body.name,
                            extension: body.extension,
                            imageblob: result
                        }, false)
                    }

                    res.send(true)
                } else {
                    res.send(true)
                }



            } catch (error) {
                console.log(error);
                res.send(false)
            }

        }
    },
    {
        method: 'post',
        path: '/save-img',
        handler: async (req, res) => {
            let body = req.body;

            try {
                const folder_open = await utilnode.openFolder();
                let view = await utilnode.whereDB('imgminify', 'imagens', { name: `${body.name}` });

                await imgminify.bufferToImage(view[0].imageblob, path.join(folder_open, view[0].name), {
                    format: view[0].extension.slice(1),
                    quality: 40,
                    compressionLevel: 5
                });

                res.send(true)
            } catch (error) {
                res.send(false)
            }
        }
    },
    {
        method: 'get',
        path: '/file/:img',
        handler: async (req, res) => {
            let img = Buffer.from(req.params.img, 'base64').toString('utf-8');
            const normalimg = decodeURI(img);
            const extName = path.extname(img);
            const contentTypes = {
                ".css": "text/css",
                ".js": "text/javascript",
                ".json": "application/json",
                ".png": "image/png",
                ".ico": "image/x-icon",
                ".jpg": "image/jpeg",
                ".svg": "image/svg+xml",
                ".mp3": "audio/mpeg",
                ".mp4": "video/mp4",
            };

            const contentType = contentTypes[extName] || "text/html";

            res.writeHead(200, { "Content-Type": contentType });
            const nameFile = path.join(normalimg);

            const readStream = fs.createReadStream(nameFile);

            readStream.pipe(res);
        }
    }
]

module.exports = [...routes, ...lib];