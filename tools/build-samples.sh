#!/bin/bash
# Rebuild one sample page per library category into samples/<category>/ (no screenshots, no network).
cd "$(dirname "$0")/.."
run(){ cat=$1; shift; node tools/mockup.mjs --trade $cat --city "Aurora, CO" --phone "(555) 010-0199" --out samples/$cat --no-png "$@" > "${TMPDIR:-/tmp}/sample-$cat.log" 2>&1 || { echo "FAIL $cat"; cat "${TMPDIR:-/tmp}/sample-$cat.log"; }; }
C="--map-center 39.7294,-104.8319"
run roofing --name "Sample Roofing Co." $C --text --zips 80010,80011,80012 --license-no "# goes here (sample)"
run hvac --name "Sample Heating & Air" $C --hours "Mon-Fri 8am-5pm" --features call-bar,quote-form,hours,map,faq --text --zips 80010,80011
run electrician --name "Sample Electric" $C --theme clean-minimal
run landscaping --name "Sample Lawn & Landscape" $C --theme warm-local --features call-bar,quote-form,before-after,map,faq
run painting --name "Sample Painting Co." --theme premium-dark
run cleaning --name "Sample Cleaning Co." --theme clean-minimal --features call-bar,quote-form,faq --email hello@example.com
run auto-repair --name "Sample Auto Repair" $C
run salon-barber --name "Sample Salon & Barber" $C --sample-reviews --features call-bar,booking,reviews,map,faq
run restaurant-foodtruck --name "Sample Food Truck" $C --hours "Fri-Sun 11am-8pm" --features call-bar,pickup-order,hours,map,faq --menu-file tools/sample-data/menu-sample.json
run fitness --name "Sample Fitness Studio" $C --theme warm-local
run pet-services --name "Sample Pet Care" $C --chat
run dental-medical --name "Sample Family Dental" $C
run real-estate --name "Sample Realty" $C
run photography --name "Sample Photography" --theme bold-industrial
# --- batch 2 ---
D=tools/sample-data
run plumbing --name "Sample Plumbing Co." $C --theme modern-bold-color --features call-bar,emergency,badges,quote-form,process,map,faq --emergency "Sample banner: the business's own after-hours wording goes here" --badges "Sample badge,Badge from the business,Another badge"
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
