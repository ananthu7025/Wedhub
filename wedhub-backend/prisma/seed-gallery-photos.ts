/**
 * One-off, additive seed script: uploads 20 real, curated, on-topic photos
 * into each of the 8 existing GalleryCategory rows (bridal-makeup-hair,
 * decor-ideas, groom-wear, jewellery-accessories, mehndi, outfit,
 * wedding-card-designs, wedding-photography) via the exact same pipeline
 * admin-media.service.ts's createInspirationUploadRequest/
 * confirmInspirationUpload uses:
 *
 *   1. upload real image bytes to R2 at platform/inspiration-images/{uuid}{ext}
 *   2. create the Media row exactly as createUnattachedInspirationImage does
 *      (mediaType: INSPIRATION_PHOTO, moderationStatus: APPROVED)
 *   3. mark it PROCESSING and enqueue the real BullMQ media-processing job
 *      so the real worker generates thumbnail/medium/blur variants
 *   4. poll until the Media row reaches status=READY
 *   5. create the FeaturedMedia row (galleryCategoryId + mediaId + sortOrder)
 *
 * Does NOT touch vendors/users/reviews/existing GalleryCategory rows —
 * purely additive: new Media + new FeaturedMedia rows only.
 *
 * Run on the server as the deploy user:
 *   cd /opt/wedhub/wedhub-backend && npx tsx prisma/seed-gallery-photos.ts
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Queue } from "bullmq";
import IORedis from "ioredis";

const prisma = new PrismaClient();

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}`);
  return v;
}

const R2_ACCOUNT_ID = requireEnv("R2_ACCOUNT_ID");
const R2_ACCESS_KEY_ID = requireEnv("R2_ACCESS_KEY_ID");
const R2_SECRET_ACCESS_KEY = requireEnv("R2_SECRET_ACCESS_KEY");
const R2_BUCKET = requireEnv("R2_BUCKET");
const REDIS_URL = requireEnv("REDIS_URL");

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

const redisConnection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
const mediaQueue = new Queue<{ mediaId: string }>("media-processing", { connection: redisConnection });

async function enqueueMediaProcessing(mediaId: string): Promise<void> {
  await mediaQueue.add(
    "process",
    { mediaId },
    { attempts: 3, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: true, removeOnFail: false },
  );
}

// ---------------------------------------------------------------------------
// Curated, individually curl-verified (HTTP 200 + image/jpeg) Unsplash direct
// CDN photo base URLs, one list per GalleryCategory slug. Each entry was
// picked from Unsplash search results filtered for genuine, visible on-topic
// match to its category (based on the photo's own alt/description text and
// search context) — not generic "wedding photo" filler. See the accompanying
// task report for sourcing methodology.
// ---------------------------------------------------------------------------
type Candidate = { id: string; note: string; base: string };

const CATALOG: Record<string, Candidate[]> = {
  "bridal-makeup-hair": [
    { id: "1sQ5P_F7R-w", note: "bridal getting makeup done", base: "https://plus.unsplash.com/premium_photo-1724762178439-1f93ad3f3cb6" },
    { id: "Uv0BoKKdxos", note: "woman in red gold sari getting ready", base: "https://images.unsplash.com/photo-1610047614301-13c63f00c032" },
    { id: "ohENjR9w0bk", note: "red bridal outfit ornate gold jewelry henna", base: "https://images.unsplash.com/photo-1610173827043-9db50e0d8ef9" },
    { id: "oeKiBmplBtU", note: "woman red dress flower in hair", base: "https://images.unsplash.com/photo-1631549424057-403e75d68e2f" },
    { id: "VPwSJhu5uhs", note: "traditional red bridal attire ornate gold jewelry veil", base: "https://images.unsplash.com/photo-1600685890506-593fdf55949b" },
    { id: "N9hRh86R4T0", note: "bridal outfit nose ring", base: "https://images.unsplash.com/photo-1684868265714-fd2300637c23" },
    { id: "YL4xphQzZrw", note: "woman red gold outfit", base: "https://images.unsplash.com/photo-1684868682581-4cac3af5b8d4" },
    { id: "Jy0FKaOdRkI", note: "stylish happy bride smiling soft light hotel room", base: "https://plus.unsplash.com/premium_photo-1661387527207-6b2919ed49d5" },
    { id: "fKZSH1fQIw8", note: "woman red dress rose in hair", base: "https://images.unsplash.com/photo-1631549423034-ceb712f24ab2" },
    { id: "w6TiEAajdtY", note: "traditional indian attire woman", base: "https://images.unsplash.com/photo-1662561283890-b00a2d5b4bfc" },
    { id: "S29gGomXEfU", note: "red gold bridal outfit", base: "https://images.unsplash.com/photo-1684868264466-4c4fcf0a5b37" },
    { id: "L4HxjqLjkrs", note: "red gold bridal getting makeup done", base: "https://plus.unsplash.com/premium_photo-1724762184102-c61dab5edf9f" },
    { id: "chtlK1HER8c", note: "red gold bridal outfit", base: "https://images.unsplash.com/photo-1634990107998-2c56c5afa573" },
    { id: "jIYSrboB7FQ", note: "white floral headdress beside white wall", base: "https://images.unsplash.com/photo-1523264114838-feca761983c4" },
    { id: "QO5GaR0InvU", note: "luxury bride and groom rich interior", base: "https://plus.unsplash.com/premium_photo-1661384250629-b506d5a57f31" },
    { id: "aXSyDSydIjU", note: "red white bridal outfit", base: "https://images.unsplash.com/photo-1740674570259-a47d713a2976" },
    { id: "mhjWvVTA_qY", note: "red gold bridal outfit", base: "https://images.unsplash.com/photo-1634990107480-1422c742f9b5" },
    { id: "rMSfrGDbc2E", note: "red dress veil on head", base: "https://images.unsplash.com/photo-1631549423660-c10874dc335f" },
    { id: "bqjBRJzWPig", note: "bride white lace dress bouquet", base: "https://plus.unsplash.com/premium_photo-1661432403711-3f7c27f329c1" },
    { id: "YJqA-p-OtmM", note: "person in red dress", base: "https://images.unsplash.com/photo-1662714802102-9825504458ca" },
  ],
  "decor-ideas": [
    { id: "eh7nESG-ZKg", note: "yellow sari sitting under flowers mandap", base: "https://plus.unsplash.com/premium_photo-1661893944387-1347f1b01f59" },
    { id: "7O422yG_b80", note: "couple traditional attire floral canopy ceremony", base: "https://images.unsplash.com/photo-1587271636175-90d58cdad458" },
    { id: "XGeKyTG6U6A", note: "decorated wedding arch floral aisle seating", base: "https://images.unsplash.com/photo-1772127822552-ce9ef537bdcf" },
    { id: "-fEotnMjQ70", note: "outdoor wedding ceremony setup elegant seating", base: "https://images.unsplash.com/photo-1772127822562-a898d9f5733c" },
    { id: "NtPSrf-Cnx4", note: "pink flowers hanging from ceiling", base: "https://plus.unsplash.com/premium_photo-1689838025882-91fdf36976ef" },
    { id: "I1i4nzL55oo", note: "multicolored floral garlands on display", base: "https://images.unsplash.com/photo-1560505605-f300b17028d6" },
    { id: "oYn9mWPvhjM", note: "pink white floral wreath", base: "https://images.unsplash.com/photo-1599335972861-b17756cf8141" },
    { id: "ll95fiFbF3M", note: "elegant wedding ceremony setups white flowers", base: "https://images.unsplash.com/photo-1753521924424-044b2240be4f" },
    { id: "6wJW9nEUtOs", note: "floral wedding backdrop with candles", base: "https://images.unsplash.com/photo-1746044159277-ced38bb9ae58" },
    { id: "be9MLsARgjY", note: "beautifully decorated stage set for event", base: "https://images.unsplash.com/photo-1745573673786-d462f0ac2690" },
    { id: "taCoSDNQbX8", note: "elegant venue decorated with flowers", base: "https://images.unsplash.com/photo-1745573673043-43a4f3b91466" },
    { id: "zcrWCpluaAM", note: "beautifully decorated stage ceremony", base: "https://images.unsplash.com/photo-1745573674357-1d6e917927cf" },
    { id: "8lDwmEfJlQg", note: "ganesha idol decorated flowers ornate backdrop", base: "https://images.unsplash.com/photo-1756902093972-d260b524b58d" },
    { id: "owF2GbJnxlc", note: "beautifully decorated stage for wedding", base: "https://images.unsplash.com/photo-1745573674206-1d4805fcc427" },
    { id: "MN1cKxwO94E", note: "decorated stage statue of ganesh", base: "https://images.unsplash.com/photo-1696563426045-dccaf49fae9f" },
    { id: "PO56PwADoFU", note: "white green wedding reception decor", base: "https://images.unsplash.com/photo-1676734627786-a3662ff6a243" },
    { id: "rng4Glt1YoY", note: "elegant wedding table setting fairy lights", base: "https://images.unsplash.com/photo-1676027647672-1230463791a9" },
    { id: "3nj-jsGwjVg", note: "beautifully set table floral arrangements event", base: "https://images.unsplash.com/photo-1758810743028-6b8e150ec98f" },
    { id: "XTfNU4XrySs", note: "elegant table setting floral arrangement candle", base: "https://images.unsplash.com/photo-1768777270907-235286662f98" },
    { id: "K60J08L_9gc", note: "pink room two mirrors plant decor", base: "https://plus.unsplash.com/premium_photo-1674625887807-7132f99b0110" },
  ],
  "groom-wear": [
    { id: "SLmG9xqt4ak", note: "man beige sherwani maroon pocket square", base: "https://plus.unsplash.com/premium_photo-1682090778813-3938ba76ee57" },
    { id: "mab4JkLEe80", note: "groom traditional indian wedding attire", base: "https://images.unsplash.com/photo-1759906766080-82b785c61f51" },
    { id: "ZOpYCh6gTaE", note: "man beige sherwani maroon pocket square", base: "https://plus.unsplash.com/premium_photo-1682090786689-741d60a11384" },
    { id: "Q29kLQviatw", note: "man cream sherwani maroon pocket square", base: "https://plus.unsplash.com/premium_photo-1682090784102-b5e9fc3fb3bb" },
    { id: "Tkb4p490hiY", note: "man traditional black gold attire watch", base: "https://images.unsplash.com/photo-1785612515427-ca9180ea2bbc" },
    { id: "-hUO_f_eEQo", note: "man traditional sherwani turban outdoors", base: "https://images.unsplash.com/photo-1781106785439-306653a7066d" },
    { id: "qyoAfulwygo", note: "man dark blue bandhgala jacket gold buttons", base: "https://plus.unsplash.com/premium_photo-1682090781379-4d177df45267" },
    { id: "WxjzR6nT7LU", note: "man traditional red gold sherwani outdoors", base: "https://images.unsplash.com/photo-1781106699888-8f59750f830e" },
    { id: "zYsnUT6CoSA", note: "man traditional indian wedding attire sunglasses", base: "https://images.unsplash.com/photo-1781106784325-52bc05c289aa" },
    { id: "dF3nzZ8ZZK4", note: "white embroidered sherwani red turban scarf", base: "https://images.unsplash.com/photo-1760080838961-4208536db385" },
    { id: "q4mC7ozaQ3M", note: "groom ornate red gold sherwani turban outdoors", base: "https://images.unsplash.com/photo-1781106699930-a692cfe30226" },
    { id: "TB2KxI0secs", note: "man traditional attire rooftop outdoors", base: "https://images.unsplash.com/photo-1781106784087-d6f4432ad721" },
    { id: "gXWVyFpRCRU", note: "man white sherwani outfit front green wall", base: "https://images.unsplash.com/photo-1729347917808-e3e35a462fec" },
    { id: "6xHLu4jBSG0", note: "white jacket red flower boutonniere", base: "https://images.unsplash.com/photo-1678805408312-04e5fd7a9dcc" },
    { id: "8OGwalxjFXg", note: "close up person wearing white sherwani coat", base: "https://images.unsplash.com/photo-1724856604247-0de2c43b6491" },
    { id: "2oQy4GAGxbk", note: "bride and groom walking down path", base: "https://images.unsplash.com/photo-1735052712489-f45220126a0c" },
    { id: "DTyA4JBJvqg", note: "man woman dressed indian attire", base: "https://images.unsplash.com/photo-1735052709952-5dce6923de0e" },
    { id: "cwwFlwvYxfk", note: "person holding hands together wedding", base: "https://images.unsplash.com/photo-1657029674341-3212a82d0bd3" },
    { id: "RHyRIjUqt0c", note: "man suit cane leather armchair", base: "https://plus.unsplash.com/premium_photo-1682090768709-b00ac36f72de" },
    { id: "d-jyMeP6uNQ", note: "couple traditional indian wedding attire", base: "https://images.unsplash.com/photo-1630526720753-aa4e71acf67d" },
  ],
  "jewellery-accessories": [
    { id: "dicH9_xBW9w", note: "close up woman wearing necklace bracelet", base: "https://plus.unsplash.com/premium_photo-1724762183134-c17cf5f5bed2" },
    { id: "KxHcyNOIO_M", note: "smiling woman adorned traditional indian jewelry", base: "https://images.unsplash.com/photo-1756483560049-e7b2208f99a0" },
    { id: "zW7hVlt6Oa0", note: "woman red gold sari jewelry", base: "https://images.unsplash.com/photo-1617633150878-7df1d12a9a57" },
    { id: "4raRmmjLD80", note: "woman pink outfit nose ring jewelry", base: "https://images.unsplash.com/photo-1684868265715-03e19a3e0e00" },
    { id: "jQ3UdoWiFis", note: "woman red gold sari jewelry", base: "https://images.unsplash.com/photo-1610173826014-d131b02d69ca" },
    { id: "ycN9bB8J6LM", note: "woman gold red sari jewelry", base: "https://images.unsplash.com/photo-1594140700783-f9e70c7abc25" },
    { id: "fQu84qm_vMQ", note: "woman wearing traditional dress jewelry", base: "https://images.unsplash.com/photo-1652374968229-a66a1c170c04" },
    { id: "Tu-aK8z8nQI", note: "woman green sari and jewelry", base: "https://images.unsplash.com/photo-1688382654723-a7366006519b" },
    { id: "njVir8eVq1M", note: "woman green sari and jewelry saree shoot", base: "https://images.unsplash.com/photo-1679006831648-7c9ea12e5807" },
    { id: "ACAHBwOsRSM", note: "gold colored necklace indian bridal jewelry", base: "https://images.unsplash.com/flagged/photo-1570055349452-29232699cc63" },
    { id: "3nYzHXMUV7k", note: "woman red gold bridal outfit jewelry", base: "https://images.unsplash.com/photo-1737515024800-5275fe7ee929" },
    { id: "CrcZxFv5P-I", note: "woman colorful headdress jewelry red background", base: "https://images.unsplash.com/photo-1665960212625-3c6b274222ed" },
    { id: "wrhy4b-AUi0", note: "woman red gold bridal outfit jewelry", base: "https://plus.unsplash.com/premium_photo-1724762184456-002573e89988" },
    { id: "T-PUQaJ8YEw", note: "woman wedding sari jewelry looking down", base: "https://images.unsplash.com/photo-1570212773364-e30cd076539e" },
    { id: "-qlW60EuUqU", note: "woman white floral dress jewelry", base: "https://images.unsplash.com/photo-1610276347467-2f3a6053d297" },
    { id: "9V7DmGQ1U1g", note: "person wearing colorful dress jewelry", base: "https://plus.unsplash.com/premium_photo-1669977749936-1343d0b0b4d9" },
    { id: "aXSyDSydIjU", note: "woman red white bridal outfit jewelry", base: "https://images.unsplash.com/photo-1740674570259-a47d713a2976" },
    { id: "VPwSJhu5uhs", note: "traditional red bridal attire ornate gold jewelry veil", base: "https://images.unsplash.com/photo-1600685890506-593fdf55949b" },
    { id: "1sQ5P_F7R-w", note: "bridal red gold jewelry getting makeup", base: "https://plus.unsplash.com/premium_photo-1724762178439-1f93ad3f3cb6" },
    { id: "FsMH6MLUjl0", note: "woman red gold wedding outfit jewelry", base: "https://plus.unsplash.com/premium_photo-1724762183683-251ce8b09d08" },
  ],
  mehndi: [
    { id: "ZPCuuUn1zPc", note: "woman with henna on hands", base: "https://images.unsplash.com/photo-1732118400647-a81e3b37be87" },
    { id: "zozHHQSlO5M", note: "womans hands with henna tattoos", base: "https://plus.unsplash.com/premium_photo-1661896237419-6e232b54eefc" },
    { id: "hutwDZusaII", note: "woman hands painted with henna", base: "https://images.unsplash.com/photo-1623217509141-6f735087b50c" },
    { id: "BcN_VPX32ys", note: "smiling woman showing henna art on hands", base: "https://images.unsplash.com/photo-1780247473263-4be70d512f5c" },
    { id: "vI0KGmBo9aY", note: "woman henna on hands holding pencil", base: "https://plus.unsplash.com/premium_photo-1661862397518-8e50332b6e97" },
    { id: "QElotO8wmLY", note: "womans hand intricate henna design flower", base: "https://images.unsplash.com/photo-1755234993813-054bc8c8a698" },
    { id: "SWU70wvo9Bs", note: "henna decorated hands with bangles raised blue sky", base: "https://images.unsplash.com/photo-1780247584715-63a6a3923f75" },
    { id: "nVEY0YvHzBU", note: "womans hand intricate henna design smartwatch", base: "https://images.unsplash.com/photo-1762950350005-1b235449a4af" },
    { id: "LAXenWju08M", note: "person white floral henna tattoo left hand", base: "https://images.unsplash.com/photo-1599671229994-bc8fd4df731c" },
    { id: "68epjpcspzQ", note: "henna art womens hand traditional moroccan wedding", base: "https://images.unsplash.com/photo-1629332791370-77208e6cbb67" },
    { id: "QLYxtvHsAlA", note: "persons feet with henna on brown sand", base: "https://images.unsplash.com/photo-1599671230758-36a2d6d93a52" },
    { id: "ix0Q5TucFP8", note: "close up decorated feet with henna and red thread", base: "https://images.unsplash.com/photo-1777749752246-f7e4f5151217" },
    { id: "LzD-4UNR5fU", note: "womans feet with henna and anklet", base: "https://images.unsplash.com/photo-1760163287823-8786a65fd269" },
    { id: "8-DKgXlqIkw", note: "close up decorated feet with henna traditional indian attire", base: "https://images.unsplash.com/photo-1760284712742-88d380777ea2" },
    { id: "TLzO_k5wvi4", note: "indian bridal hand with mehandi design", base: "https://plus.unsplash.com/premium_photo-1682092018999-2c8fcfe944f3" },
    { id: "mKbD7N0hEwE", note: "bride traditional attire intricate henna", base: "https://images.unsplash.com/photo-1759720888181-7b56230250d0" },
    { id: "QmP03s3JKe0", note: "hands with henna and marigold garlands", base: "https://images.unsplash.com/photo-1771992228898-79342c9c1c39" },
    { id: "ZVRwm75I4S8", note: "hands adorned with henna and marigold garlands", base: "https://images.unsplash.com/photo-1771992226177-759e116e72f4" },
    { id: "g8OXeDkkuz0", note: "brides hands adorned with henna and marigold flowers", base: "https://images.unsplash.com/photo-1771992230505-97e0c3d38213" },
    { id: "VcGC9vz_PR0", note: "woman applying intricate henna design on arm", base: "https://images.unsplash.com/photo-1774019411246-c3bd5327a160" },
  ],
  outfit: [
    { id: "iFpqcSJGaCo", note: "woman sitting on chair bridal outfit", base: "https://plus.unsplash.com/premium_photo-1724762182780-000d248f9301" },
    { id: "Xqa_NWl4xEY", note: "woman pink orange sari gold jewelry between trees", base: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb" },
    { id: "rjgFxE3eARQ", note: "woman red white sari near green trees daytime", base: "https://images.unsplash.com/photo-1619516388835-2b60acc4049e" },
    { id: "Rm9DL9DmGi4", note: "woman in sari posing for picture", base: "https://images.unsplash.com/photo-1727430228383-aa1fb59db8bf" },
    { id: "FsMH6MLUjl0", note: "woman red gold wedding outfit", base: "https://plus.unsplash.com/premium_photo-1724762183683-251ce8b09d08" },
    { id: "T-PUQaJ8YEw", note: "woman wedding sari looking downwards", base: "https://images.unsplash.com/photo-1570212773364-e30cd076539e" },
    { id: "aXSyDSydIjU", note: "woman red white bridal outfit", base: "https://images.unsplash.com/photo-1740674570259-a47d713a2976" },
    { id: "CXIT2LBJmjI", note: "woman red bridal outfit", base: "https://images.unsplash.com/photo-1677691257005-9d69ab23f485" },
    { id: "zeRngVZRPyU", note: "woman black sari standing against wall", base: "https://plus.unsplash.com/premium_photo-1691030256266-25e89a3bfd74" },
    { id: "AmKDdf_ErUA", note: "woman red gold wedding outfit", base: "https://images.unsplash.com/photo-1732508531942-f36d9da79d9e" },
    { id: "c6hs0HT9pZs", note: "woman red bridal outfit", base: "https://images.unsplash.com/photo-1677691256999-45d69a11b197" },
    { id: "PmWzCKJIVkU", note: "woman traditional indian wedding attire smiles", base: "https://images.unsplash.com/photo-1756483571456-6fa86cb1ae53" },
    { id: "UJHWpKz70Lc", note: "woman red dress sitting down", base: "https://images.unsplash.com/photo-1729773173866-022d39fc6c50" },
    { id: "x9KgVjd3AVA", note: "woman red gold sari", base: "https://images.unsplash.com/photo-1600312914724-0c318dd0eb29" },
    { id: "tWkK51TlsdE", note: "woman long pink orange dress marshy pond", base: "https://plus.unsplash.com/premium_photo-1682096159299-5e8a6d5d442b" },
    { id: "wrRVsNyuCW4", note: "woman sari jewelry posing for picture", base: "https://images.unsplash.com/photo-1673413349218-ba4de23c2958" },
    { id: "8vmvtj_W4xQ", note: "group women red gold sari dress on bench", base: "https://images.unsplash.com/photo-1583878448938-0de973eec3b9" },
    { id: "i7zfFnsIBhI", note: "woman red gold floral dress holding microphone", base: "https://images.unsplash.com/photo-1600687436073-86a81c9b0daa" },
    { id: "CrcZxFv5P-I", note: "woman colorful headdress red background outfit", base: "https://images.unsplash.com/photo-1665960212625-3c6b274222ed" },
    { id: "wrhy4b-AUi0", note: "woman red gold bridal outfit", base: "https://plus.unsplash.com/premium_photo-1724762184456-002573e89988" },
  ],
  "wedding-card-designs": [
    { id: "qSjRSQYvo14", note: "overhead invitation mockups neutral palette", base: "https://plus.unsplash.com/premium_photo-1718119448313-d410ef57b57b" },
    { id: "BrfCiLC7Grc", note: "sheet paper surrounded pink roses invitation", base: "https://images.unsplash.com/photo-1579532649672-13fac8cde626" },
    { id: "fEqKjlYbS7k", note: "wedding invitations pine branches ribbon", base: "https://images.unsplash.com/photo-1763414902882-4e9d4f8e6275" },
    { id: "cO3yOxRrMhQ", note: "invitation mockups neutral color palette", base: "https://plus.unsplash.com/premium_photo-1718119437448-68a94432a0e0" },
    { id: "LMdggl2e0OM", note: "wedding stationery mockup styled scene", base: "https://images.unsplash.com/photo-1648656433526-b67d4b93c836" },
    { id: "MPoMidrtVjk", note: "table topped blank cards wedding invitation mockup", base: "https://plus.unsplash.com/premium_photo-1718119444480-f7e4112ed7a2" },
    { id: "-NNnY96sDW0", note: "white envelope pink flower scissors invitation", base: "https://images.unsplash.com/photo-1633008965536-4f0766340980" },
    { id: "UFK3nlm-mDU", note: "wedding stationery mockup text letter", base: "https://images.unsplash.com/photo-1648656433371-14c1f0485a2f" },
    { id: "e6gpbUKUrI8", note: "table several pieces wedding stationery paper", base: "https://images.unsplash.com/photo-1648656433394-6f488f55c561" },
    { id: "k0m8s8ibvQQ", note: "white green wedding stationery set blank card envelope wax seal", base: "https://plus.unsplash.com/premium_photo-1661599969164-1435f0f53c0a" },
    { id: "cH3sw3ILU0U", note: "table pink white items wedding invitation", base: "https://images.unsplash.com/photo-1633008460512-624a321c15b6" },
    { id: "HIw5gIcoJoo", note: "wedding stationery set flat lay blank invitation card mockup green envelopes wax seal dried flowers", base: "https://plus.unsplash.com/premium_photo-1661599866396-16ee71927e67" },
    { id: "a0BlHWem6l0", note: "wedding stationery black white envelope", base: "https://images.unsplash.com/photo-1632610992723-82d7c212f6d7" },
    { id: "UpEzGVpL63E", note: "wedding stationery arranged beautifully with ribbons", base: "https://images.unsplash.com/photo-1745681503277-00eef94c5a3d" },
    { id: "AuZp_2LGSCs", note: "close up wedding stationery on a table", base: "https://images.unsplash.com/photo-1738898179451-b5fc497f9f8e" },
    { id: "oUhlJR1XajY", note: "wedding stationery arranged on fabric", base: "https://images.unsplash.com/photo-1741893043659-ca8b82a8b637" },
    { id: "vRvl8KCx7gY", note: "wedding invitations with pine branches and lights", base: "https://images.unsplash.com/photo-1764731080480-58b18e519bd9" },
    { id: "5ZribvTyQVQ", note: "wedding invitations and stationery displayed with greenery", base: "https://images.unsplash.com/photo-1742581659446-6260fc707e7d" },
    { id: "BiT7NBELhTg", note: "close up wedding suite on a bed", base: "https://images.unsplash.com/photo-1732649124686-3bab54f79aa3" },
    { id: "bjBxrZ1t_3Q", note: "blank card torn edges green envelopes wax seal stamp", base: "https://plus.unsplash.com/premium_photo-1661599028992-3091d50d880b" },
  ],
  "wedding-photography": [
    { id: "LLd5F6surIk", note: "bride groom standing on staircase", base: "https://plus.unsplash.com/premium_photo-1675851210855-e7727076e829" },
    { id: "1Bs2sZ9fD2Q", note: "man gray suit woman white wedding dress", base: "https://images.unsplash.com/photo-1591604466107-ec97de577aff" },
    { id: "5BB_atDT4oA", note: "groom beside bride holding bouquet flowers", base: "https://images.unsplash.com/photo-1519741497674-611481863552" },
    { id: "mLIurLmSRAY", note: "woman in white wedding dress", base: "https://images.unsplash.com/photo-1606216794079-73f85bbd57d5" },
    { id: "f_JswcZu6jU", note: "bride groom standing in field", base: "https://plus.unsplash.com/premium_photo-1664530453131-ed0e68f9189c" },
    { id: "WJc87MVcDaA", note: "smiling newly wed couple about to kiss green field", base: "https://images.unsplash.com/photo-1546032996-6dfacbacbf3f" },
    { id: "qGgjalogCdE", note: "man gray suit kissing woman white dress", base: "https://images.unsplash.com/photo-1596457221755-b96bc3a6df18" },
    { id: "tEFItLGn0uc", note: "man woman kissing near green plants daytime", base: "https://images.unsplash.com/photo-1607357910286-1ff94ac13c24" },
    { id: "VPCIQIa_Hjk", note: "bride groom embracing each other in field", base: "https://plus.unsplash.com/premium_photo-1690148812608-9942834931a1" },
    { id: "d-jyMeP6uNQ", note: "couple traditional indian wedding attire", base: "https://images.unsplash.com/photo-1630526720753-aa4e71acf67d" },
    { id: "haRyBAihS_0", note: "man woman kissing brown grass field daytime", base: "https://images.unsplash.com/photo-1604017011826-d3b4c23f8914" },
    { id: "R0XbbliVWt4", note: "man woman hugging on the stairs", base: "https://plus.unsplash.com/premium_photo-1675851210850-de5525809dd9" },
    { id: "mUYjrnQLrSA", note: "woman white wedding dress holding bouquet", base: "https://images.unsplash.com/photo-1591604442449-ecc9943efabf" },
    { id: "7baHM9rEYUw", note: "groom bride about to kiss daytime", base: "https://images.unsplash.com/photo-1537633468298-d86f0c2d4173" },
    { id: "pYMnnA-sYME", note: "newly wed couple facing each other forest", base: "https://images.unsplash.com/photo-1571131639829-a022890def49" },
    { id: "SsXmIeltL-s", note: "newly married couple standing steps of building", base: "https://plus.unsplash.com/premium_photo-1675851211534-4acd0a2b69a8" },
    { id: "Zx9In5UiU0w", note: "man kissing woman on cheek", base: "https://images.unsplash.com/photo-1715285977649-4a83c0820399" },
    { id: "BJrbQpEshtY", note: "man woman standing next to each other wedding", base: "https://images.unsplash.com/photo-1721401870202-8e2264ecced2" },
    { id: "QO5GaR0InvU", note: "luxury bride and elegant groom rich interior", base: "https://plus.unsplash.com/premium_photo-1661384250629-b506d5a57f31" },
    { id: "VPwSJhu5uhs", note: "traditional red bridal attire couple veil", base: "https://images.unsplash.com/photo-1600685890506-593fdf55949b" },
  ],
};

function photoUrl(base: string): string {
  return `${base}?w=1600&q=80&fm=jpg&fit=crop`;
}

async function fetchImageBytes(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("image")) throw new Error(`Not an image (${contentType}) for ${url}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadToR2(objectKey: string, body: Buffer): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: objectKey,
      Body: body,
      ContentType: "image/jpeg",
      CacheControl: IMMUTABLE_CACHE_CONTROL,
    }),
  );
}

async function waitForReady(mediaId: string, timeoutMs = 120_000): Promise<"READY" | "FAILED" | "TIMEOUT"> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const media = await prisma.media.findUnique({ where: { id: mediaId }, select: { status: true } });
    if (!media) return "TIMEOUT";
    if (media.status === "READY") return "READY";
    if (media.status === "FAILED") return "FAILED";
    await new Promise((r) => setTimeout(r, 2000));
  }
  return "TIMEOUT";
}

type ResultRow = { category: string; photoId: string; mediaId?: string; status: string; note?: string };

async function main() {
  const categories = await prisma.galleryCategory.findMany({
    where: { slug: { in: Object.keys(CATALOG) } },
    select: { id: true, slug: true, name: true },
  });
  const bySlug = new Map(categories.map((c) => [c.slug, c]));

  const results: ResultRow[] = [];

  for (const [slug, candidates] of Object.entries(CATALOG)) {
    const category = bySlug.get(slug);
    if (!category) {
      console.error(`GalleryCategory slug ${slug} not found in DB — skipping entire category`);
      continue;
    }

    // Existing count for this category, so re-runs are additive/idempotent-ish
    // (append more up to 20 rather than duplicating already-featured photos).
    const existingCount = await prisma.featuredMedia.count({ where: { galleryCategoryId: category.id } });
    let sortOrder = existingCount;
    let addedThisCategory = 0;
    const targetToAdd = Math.max(0, 20 - existingCount);

    console.log(`\n=== ${slug} (existing=${existingCount}, need to add=${targetToAdd}) ===`);

    for (const candidate of candidates) {
      if (addedThisCategory >= targetToAdd) break;
      const url = photoUrl(candidate.base);
      try {
        // 1. Fetch real bytes
        const bytes = await fetchImageBytes(url);

        // 2. Upload to R2
        const objectKey = `platform/inspiration-images/${randomUUID()}.jpg`;
        await uploadToR2(objectKey, bytes);

        // 3. Create Media row exactly as createUnattachedInspirationImage does
        const media = await prisma.media.create({
          data: {
            mediaType: "INSPIRATION_PHOTO",
            originalObjectKey: objectKey,
            mimeType: "image/jpeg",
            fileSize: bytes.length,
            moderationStatus: "APPROVED",
          },
        });

        // 4. Mark PROCESSING + enqueue real worker job
        await prisma.media.update({ where: { id: media.id }, data: { status: "PROCESSING" } });
        await enqueueMediaProcessing(media.id);

        // 5. Poll until READY
        const finalStatus = await waitForReady(media.id);
        if (finalStatus !== "READY") {
          results.push({ category: slug, photoId: candidate.id, mediaId: media.id, status: finalStatus, note: candidate.note });
          console.log(`  [${finalStatus}] ${candidate.id} (${candidate.note}) — mediaId=${media.id}`);
          continue;
        }

        // 6. Create FeaturedMedia row
        await prisma.featuredMedia.create({
          data: {
            mediaId: media.id,
            galleryCategoryId: category.id,
            sortOrder,
          },
        });

        results.push({ category: slug, photoId: candidate.id, mediaId: media.id, status: "READY+FEATURED", note: candidate.note });
        console.log(`  [OK] ${candidate.id} (${candidate.note}) — mediaId=${media.id} sortOrder=${sortOrder}`);
        sortOrder += 1;
        addedThisCategory += 1;
      } catch (err) {
        results.push({ category: slug, photoId: candidate.id, status: "ERROR", note: String(err) });
        console.error(`  [ERROR] ${candidate.id}: ${String(err)}`);
      }
    }

    if (addedThisCategory < targetToAdd) {
      console.warn(`  WARNING: only added ${addedThisCategory}/${targetToAdd} for ${slug} (ran out of candidates or hit errors)`);
    }
  }

  console.log("\n=== SUMMARY ===");
  const bySlugCounts = new Map<string, { ok: number; fail: number }>();
  for (const r of results) {
    const entry = bySlugCounts.get(r.category) ?? { ok: 0, fail: 0 };
    if (r.status === "READY+FEATURED") entry.ok += 1;
    else entry.fail += 1;
    bySlugCounts.set(r.category, entry);
  }
  for (const [slug, counts] of bySlugCounts) {
    console.log(`${slug}: added ${counts.ok}, failed ${counts.fail}`);
  }

  const failures = results.filter((r) => r.status !== "READY+FEATURED");
  if (failures.length) {
    console.log("\nFailures/non-ready:");
    for (const f of failures) console.log(`  ${f.category} / ${f.photoId}: ${f.status} ${f.note ?? ""}`);
  }

  await mediaQueue.close();
  await redisConnection.quit();
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
