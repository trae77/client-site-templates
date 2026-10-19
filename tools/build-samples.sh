#!/bin/bash
# Rebuild one sample page per library category into samples/<category>/ (no screenshots, no network).
cd "$(dirname "$0")/.."
faq(){ mkdir -p tools/sample-data/faq; node tools/mockup.mjs --faq-bank --trade "$1" 2>/dev/null | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.stringify(JSON.parse(d).map(x=>({q:x.q,a:"Sample answer: the owner\u2019s own answer goes here."})),null,2)))' > "tools/sample-data/faq/$1.json"; }
run(){ cat=$1; shift; faq $cat; node tools/mockup.mjs --faq-file tools/sample-data/faq/$cat.json --trade $cat --city "Aurora, CO" --phone "(555) 010-0199" --out samples/$cat --no-png "$@" > "${TMPDIR:-/tmp}/sample-$cat.log" 2>&1 || { echo "FAIL $cat"; cat "${TMPDIR:-/tmp}/sample-$cat.log"; }; }
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
run handyman --name "Sample Handyman" $C --theme earthy-organic --features call-bar,quote-form,process,before-after,faq --checklist "Placeholder task,Placeholder task,Placeholder task"
run pressure-washing --name "Sample Pressure Washing" $C --theme coastal-fresh --features call-bar,quote-form,before-after,pricing,map,faq --pricing-file $D/pricing-sample.json
run concrete --name "Sample Concrete Co." $C
run fencing --name "Sample Fence Co." $C
run pest-control --name "Sample Pest Control" $C
run moving --name "Sample Movers" $C
run tree-service --name "Sample Tree Service" $C
run tattoo --name "Sample Tattoo Studio" $C --theme modern-bold-color
run daycare --name "Sample Child Care" $C --team-file $D/team-sample.json
run law-accounting --name "Sample Law & Accounting" $C --features quote-form,process,pricing,team,map,faq --pricing-file $D/pricing-sample.json --team-file $D/team-sample.json
run church --name "Sample Community Church" $C --hours "Gathering times go here" --features hours,map,faq
run restaurant-ordering --name "Sample Kitchen" $C --menu-file $D/menu-sample.json --email orders@example.com
