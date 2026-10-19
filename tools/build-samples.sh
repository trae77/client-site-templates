#!/bin/bash
# Rebuild one sample page per library category into samples/<category>/ (no screenshots, no network).
cd "$(dirname "$0")/.."
run(){ cat=$1; shift; node tools/mockup.mjs --trade $cat --city "Aurora, CO" --phone "(555) 010-0199" --out samples/$cat --no-png "$@" > "${TMPDIR:-/tmp}/sample-$cat.log" 2>&1 || { echo "FAIL $cat"; cat "${TMPDIR:-/tmp}/sample-$cat.log"; }; }
C="--map-center 39.7294,-104.8319"
run roofing --name "Sample Roofing Co." $C
run hvac --name "Sample Heating & Air" $C --hours "Mon-Fri 8am-5pm" --features call-bar,quote-form,hours,map,faq
run electrician --name "Sample Electric" $C --theme clean-minimal
run landscaping --name "Sample Lawn & Landscape" $C --theme warm-local --features call-bar,quote-form,before-after,map,faq
run painting --name "Sample Painting Co." --theme premium-dark
run cleaning --name "Sample Cleaning Co." --theme clean-minimal --features call-bar,quote-form,faq --email hello@example.com
run auto-repair --name "Sample Auto Repair" $C
run salon-barber --name "Sample Salon & Barber" $C --sample-reviews --features call-bar,booking,reviews,map,faq
run restaurant-foodtruck --name "Sample Food Truck" $C --hours "Fri-Sun 11am-8pm" --features call-bar,menu,hours,map,faq
run fitness --name "Sample Fitness Studio" $C --theme warm-local
run pet-services --name "Sample Pet Care" $C --chat
run dental-medical --name "Sample Family Dental" $C
run real-estate --name "Sample Realty" $C
run photography --name "Sample Photography" --theme bold-industrial
