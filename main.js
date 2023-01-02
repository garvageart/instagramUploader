import { IgApiClient } from 'instagram-private-api';
import 'dotenv/config';
import fs from 'fs';
import dayjs from 'dayjs';
import ExifReader from 'exifreader';
import * as beautilize from 'beautilize';
import inquirer from 'inquirer';


const ig = new IgApiClient();
// You must generate device id's before login.
// Id's generated based on seed
// So if you pass the same value as first argument - the same id's are generated every time
// Optionally you can setup proxy url
// ig.state.proxyUrl = process.env.IG_PROXY;
async function login () {
    // Execute all requests prior to authorization in the real Android application
    // Not required but recommended
    // await ig.simulate.preLoginFlow();
    ig.state.generateDevice(process.env.IG_USERNAME);
    const loggedInUser = await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);
    // The same as preLoginFlow()
    // Optionally wrap it to process.nextTick so we dont need to wait ending of this bunch of requests
    // process.nextTick(async () => await ig.simulate.postLoginFlow());
    // Create UserFeed instance to get loggedInUser's posts
    return loggedInUser;
};

/**
 * 
 * @param {import('instagram-private-api').AccountRepositoryLoginResponseLogged_in_user} userSession 
 */
async function postImage (userSession) {
    const userFeed = ig.feed.user(userSession.pk);
    const userPosts = await userFeed.items();
    console.log("Successfully logged into Instagram!");

    const directoryName = "test_images";
    const imagesDir = await fs.promises.readdir(directoryName);
    const fileName = imagesDir[0];
    const filePath = `${directoryName}/${fileName}`;
    const fileBuffer = await fs.promises.readFile(filePath);
    const fileStats = await fs.promises.stat(filePath);
    const photoTags = ExifReader.load(fileBuffer, { expanded: true }).exif;
    const fileEXIFDate = photoTags?.DateTimeOriginal?.description ?? photoTags?.DateTime?.description;
    const photoTakenDate = beautilize.convertEXIFDateTime(fileEXIFDate) ?? fileStats.birthtime;
    const dateFormatted = dayjs(photoTakenDate).format('DD.MM.YYYY');
    const logDateFormatted = () => dayjs().format('DD-MM-YYYY HH:mm:ss');
    const currentMonth = dayjs().toDate().toLocaleDateString('en-ZA', { month: 'long' });
    const currentYear = dayjs().toDate().toLocaleDateString('en-ZA', { year: 'numeric' });

    const promptAnswer = await inquirer.prompt([
        {
            name: 'postCaption',
            type: 'input',
            message: 'Enter the caption of the post:'
        }
    ]);

    const postResult = await ig.publish.album({
        items: imagesDir.map(imageName => {
            const imagePath = `${directoryName}/${imageName}`;
            const imageBuffer = fs.readFileSync(imagePath);

            return {
                file: imageBuffer,
                coverImage: imageBuffer,
            }
        }),
        caption: `${promptAnswer.postCaption} :: ${dateFormatted} :: Archived - ${currentMonth} ${currentYear} ::`
    });
    console.log(`[${logDateFormatted()}] Upload to Instagram is complete!`);
    console.log(postResult);
}

await login().then((userSession) => postImage(userSession));