const TECH_DATA = {
    tech1: { id: 'tech1', name: 'عبده يوسف', type: 'مداخن', target: 135, password: '111' },
    tech2: { id: 'tech2', name: 'محمود الزهري', type: 'مداخن', target: 135, password: '222' },
    tech3: { id: 'tech3', name: 'عبد التواب الجبالي', type: 'مداخن', target: 135, password: '333' },
    tech4: { id: 'tech4', name: 'سيد صلاح', type: 'تحويلات', target: 210, password: '444' },
    tech5: { id: 'tech5', name: 'حسن محمد', type: 'تحويلات', target: 210, password: '555' },
    tech6: { id: 'tech6', name: 'عبد الرحمن الفولي', type: 'تحويلات', target: 210, password: '666' },
    tech7: { id: 'tech7', name: 'محمود سويلم', type: 'تحويلات', target: 210, password: '777' }
};

const DEFAULT_TECH_PASSWORD = "123";
const ADMIN_PASSWORD = "184579";
const VIEWER_PASSWORD = "888";


function calculateMonthlyStats(records, techType) {
    let rawDomestic = 0, rawReplace = 0, rawCommercial = 0, rawChimney = 0, rawVent = 0, rawVacation = 0;
    records.forEach(r => {
        rawDomestic += Number(r.domestic) || 0;
        rawReplace += Number(r.replace) || 0;
        rawCommercial += Number(r.commercial) || 0;
        rawChimney += Number(r.chimney) || 0;
        rawVent += Number(r.vent) || 0;
        rawVacation += Number(r.vacation) || 0;
    });

    let extraVents = Math.max(0, rawVent - rawChimney);
    let done = 0;

    if (techType === 'مداخن') {
        done = rawChimney + 
               ((rawDomestic + rawReplace) / 3) + 
               ((rawCommercial * 1.5) / 3) + 
               (extraVents * 0.4);
    } else {
        done = (rawDomestic + rawReplace) + 
               (rawCommercial * 1.5) + 
               (rawChimney * 1.6) + 
               (extraVents * (0.4 * 1.6));
    }

    return { 
        rawDomestic, rawReplace, rawCommercial, rawChimney, rawVent, rawVacation,
        done: Number(done.toFixed(2)) 
    };
}
