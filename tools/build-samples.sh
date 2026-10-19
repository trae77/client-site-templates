#!/bin/bash
# Rebuild one sample page per library category into samples/<category>/ (no screenshots, no network).
cd "$(dirname "$0")/.."
faq(){ mkdir -p tools/sample-data/faq; node tools/mockup.mjs --faq-bank --trade "$1" 2>/dev/null | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.stringify(JSON.parse(d).map(x=>({q:x.q,a:"Sample answer: the owner\u2019s own answer goes here."})),null,2)))' > "tools/sample-data/faq/$1.json"; }
run(){ cat=$1; shift; faq $cat; node tools/mockup.mjs --faq-file tools/sample-data/faq/$cat.json --trade $cat --city "Aurora, CO" --phone "(555) 010-0199" --out samples/$cat --no-png "$@" > "${TMPDIR:-/tmp}/sample-$cat.log" 2>&1 || { FAILED=1; echo "FAIL $cat"; cat "${TMPDIR:-/tmp}/sample-$cat.log"; }; }
C="--map-center 39.7294,-104.8319"
run roofing --name "Sample Roofing Co." $C --text --zips 80010,80011,80012 --license-no "# goes here (sample)"
run hvac --name "Sample Heating & Air" $C --hours "Mon-Fri 8am-5pm" --features call-bar,quote-form,hours,map,faq --text --zips 80010,80011
run electrician --name "Sample Electric" $C --theme clean-minimal --text --zips 80010,80011
run landscaping --name "Sample Lawn & Landscape" $C --theme warm-local --features call-bar,before-after,map,faq --money instant-quote
run painting --name "Sample Painting Co." --theme premium-dark
run cleaning --name "Sample Cleaning Co." --theme clean-minimal --features call-bar,faq --money instant-quote
run auto-repair --name "Sample Auto Repair" $C
run salon-barber --name "Sample Salon & Barber" $C --sample-reviews --features call-bar,booking,reviews,map,faq
run restaurant-foodtruck --name "Sample Food Truck" $C --cuisine "Cuisine goes here" --hours "Fri-Sun 11am-8pm" --features call-bar,pickup-order,hours,map,faq --menu-file tools/sample-data/menu-sample.json
run fitness --name "Sample Fitness Studio" $C --theme warm-local
run pet-services --name "Sample Pet Care" $C --chat
run dental-medical --name "Sample Family Dental" $C
run real-estate --name "Sample Realty" $C --listings-file tools/sample-data/listings-sample.json --brokerage "Sample Brokerage (placeholder)"
run photography --name "Sample Photography" --theme bold-industrial
# --- batch 2 ---
D=tools/sample-data
run plumbing --name "Sample Plumbing Co." $C --theme modern-bold-color --features call-bar,emergency,badges,process,map,faq --money emergency-request --text --zips 80010,80011 --emergency "Sample banner: the business's own after-hours wording goes here" --badges "Sample badge,Badge from the business,Another badge"
run handyman --name "Sample Handyman" $C --theme earthy-organic --features call-bar,quote-form,process,before-after,faq --checklist "Placeholder task,Placeholder task,Placeholder task" --money job-list
run pressure-washing --name "Sample Pressure Washing" $C --theme coastal-fresh --features call-bar,before-after,map,faq --money instant-quote
run concrete --name "Sample Concrete Co." $C
run fencing --name "Sample Fence Co." $C
run pest-control --name "Sample Pest Control" $C
run moving --name "Sample Movers" $C
run tree-service --name "Sample Tree Service" $C
run tattoo --name "Sample Tattoo Studio" $C --theme modern-bold-color
run daycare --name "Sample Child Care" $C --team-file $D/team-sample.json
run law-accounting --name "Sample Law & Accounting" $C --features quote-form,process,team,map,faq --team-file $D/team-sample.json
run church --name "Sample Community Church" $C --hours "Gathering times go here" --features hours,map,faq
run restaurant-ordering --name "Sample Kitchen" $C --menu-file $D/menu-sample.json --email orders@example.com
# --- design system (spec v1 P2 / v4 A): palettes, fonts, layouts, heroes ---
dz(){ id=$1; shift; node tools/mockup.mjs --city "Aurora, CO" --phone "(555) 010-0199" --out samples/design-$id --no-png "$@" > "${TMPDIR:-/tmp}/sample-design-$id.log" 2>&1 || { FAILED=1; echo "FAIL design-$id"; cat "${TMPDIR:-/tmp}/sample-design-$id.log"; }; }
dz dental-care-visit --trade dental-medical --name "Sample Family Dental" $C --faq-file $D/faq/dental-medical.json --palette auto --fonts auto --layout care-visit
dz dental-care-proof --trade dental-medical --name "Sample Family Dental" $C --palette auto --fonts estate --layout care-proof --license-no "# goes here (sample)"
dz fitness-fit-schedule --trade fitness --name "Sample Fitness Studio" $C --palette auto --fonts auto --layout fit-schedule --schedule-file $D/schedule-sample.json
dz fitness-fit-community --trade fitness --name "Sample Fitness Studio" $C --palette auto --fonts street --layout fit-community
dz photography-photo-portfolio --trade photography --name "Sample Photography" --palette auto --fonts auto --layout photo-portfolio
dz real-estate-re-search --trade real-estate --name "Sample Realty" $C --listings-file $D/listings-sample.json --brokerage "Sample Brokerage (placeholder)" --palette auto --fonts auto --layout re-search
dz restaurant-rest-order --trade restaurant-foodtruck --name "Sample Bistro" $C --hours "Fri-Sun 11am-8pm" --features call-bar,pickup-order,hours,map,faq --faq-file $D/faq/restaurant-foodtruck.json --menu-file $D/menu-sample.json --palette auto --fonts auto --layout rest-order
dz salon-salon-book --trade salon-barber --name "Sample Salon & Barber" $C --sample-reviews --features call-bar,booking,reviews,map,faq --faq-file $D/faq/salon-barber.json --palette auto --fonts auto --layout salon-book
dz plumbing-trade-emergency --trade plumbing --name "Sample Plumbing Co." $C --money emergency-request --text --palette auto --fonts auto --layout trade-emergency
dz pest-control-trade-lead --trade pest-control --name "Sample Pest Control" $C --palette auto --fonts auto --layout trade-lead
exit ${FAILED:-0}
