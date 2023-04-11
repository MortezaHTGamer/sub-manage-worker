
//اینجا کانفیگ vless که میخواین آی پی های تمیز برای تولید بشه رو قرار بدین
const myConfigs = "vless://....";
//دامین اصلی شما که در کانکشن وجود داره رو مشخص کنید که به جاش آی پی های تمیز هر اپراتور قرار بگیره
const replaceDomain = 'subdomain.domain.website';
//اگر از اسم کانفیگ در کانکشن استفاده میکنید اینجا مشخص کنید تا با اسم اپراتور ها جایگزین بشه اینطوری راحتر میشه فهمید چه کانکشنی برای چه اپراتوری هست
const replaceName = 'myconnection';
//اسم SNI که در داخل کانفیگ با یک سابدامین تولید شده رندوم برای جلوگیری از فیلتر شدن استفاده میشه
const replaceSNI = 'subdomain.domain.website';
//دامین اصلی که بر همون اساس سابدامین رندوم تولید بشه  
const domian = 'domain.website';
// بر اساس پارامتر ارسالی در درخواست اگر مقدار آن true باشد کاربر فقط از آپی های که خودش ارسال کرده استفاده میکنه
//https://test.workers.dev/sub?user=USERNAME&useOwnList=true
let useOwnList = false;
// میتونید مشخص کنید درخواست ساب محدود به چند اپراتور بشن اگر Null قرار بدین همه اپراتورها تولید و نمایش داده میشه 
// با , جدا کنید در خواست 
// مثلا 
// https://test.workers.dev/sub?user=USERNAME&operators=HAMRAHE_AVAL,Mobinnet
// اسم اپراتورها باید با اسم هایی که در بخش cleanIPPerOperator مشخص کردین یکی باشه
let userPrefrences = null;

//اگر کاربر از ایپی های خودش استفاده نکنه میتونه از لیست آی پی هایی که شما اینجا تعریف کردین استفاده کنه یا اینکه از لیست آی پی هایی که بقیه کاربران به صورت عمومی ارسال کردن
const cleanIPPerOperator = {
    ASIATECH: [],
    HIWEB: [],
    IRANCELL: [],
    MOBINNET: [],
    HAMRAHE_AVAL: [],
    MOKHABERAT: [],
    PARSONLINE: [],
    RIGHTEL: [],
    SHATTEL: [],
    // می تونید مثلا دامین اصلی رو هم اضافه کنین که یک کانکشن با دامین اصلی در لیست ساب قرار بگیره
    MAIN: [], // ['subdomain.yourdomain.test','subdomain2.yourdomain.test']
}

export default {
    async fetch(request, env) {

        var url = new URL(request.url)
        var pathParts = url.pathname.replace(/^\/|\/$/g, "").split("/")
        var type = pathParts[0].toLowerCase()
        let user = getParameterByName('user', request.url);

        if (type == 'whitelist') {


            //برای ارسال لیست آی پی های تمیز و ذخیره اون یک درخواست GET به ورکر ارسال کنید به صورت زیر 
            // https://test.workers.dev/whitelist?operator=HAMRAHE_AVAL&&whitelist=172.6.2.25,172.3.35.36&user=USERNAME
            //USERNAME = نام کاربری اگر ارسال شود لیست فقط برای این کاربر استفاده میشه بعدا اگر ارسال نشه لیست به صورت عمومی ذخیره میشه و بقیه هم میتونن استفاده کنن

            let operator = getParameterByName('operator', request.url);
            let whiteList = getParameterByName('whitelist', request.url);

            if (!operator.length || !whiteList.length) {
                return new Response("Invalid Request");
            }

            let ipSaveKey = user.length > 0 ? operator + user : operator;
            await env.SUB.put(ipSaveKey.trim(), whiteList, { expirationTtl: 15552000 });
            return new Response("Ip List Update Successfully");
        }

        if (type == 'sub') {

            userPrefrences = getParameterByName('operators', request.url);
            useOwnList = getParameterByName('ownList', request.url);
            useOwnList = useOwnList === "true" ? true : false;

            if (userPrefrences.length) {
                userPrefrences = userPrefrences.split(',').map(item => item.toLowerCase());
            }

            let newConfigs = await GetConfigs(user, env);
            return new Response(newConfigs.join("\n"));
        }

        return new Response("Invalid Request");
    }

}

async function GetConfigs(user, env) {

    let newConfigs = []

    for (const key of Object.keys(cleanIPPerOperator)) {

        let opertatorKeyName = useOwnList ? key + user : key;
        let customList = await env.SUB.get(opertatorKeyName.trim());

        if (customList != null && customList.length) {
            cleanIPPerOperator[key] = customList.split(',');
        }

        if (userPrefrences != null && userPrefrences.length && userPrefrences.indexOf(key.toLowerCase()) === -1) {
            continue;
        }

        for (const ip of cleanIPPerOperator[key]) {
            let generated = myConfigs
                .replace('@' + replaceDomain, '@' + ip)
                .replace('#' + replaceName, '#' + key)
                .replace('sni=' + replaceSNI, RandomString(8) + '.' + domian);
            newConfigs.push(generated);
        }

    }

    return newConfigs;
}

function getParameterByName(name, url) {
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return "";
    if (!results[2]) return "";
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function RandomString(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}