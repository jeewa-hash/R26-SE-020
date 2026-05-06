import os
import requests
import re
from urllib.parse import quote_plus

def download_images():
    base_dir = os.path.dirname(os.path.abspath(__file__)) + "/../dataset/training"
    
    # Mapping of ALL 53 folder names to search queries
    dataset_tasks = {
        # Lighting
        "lighting_flickering_bulb": "flickering light bulb broken",
        "lighting_broken_bulb_holder": "broken light bulb holder damage",
        "lighting_ceiling_light_not_working": "broken ceiling light repair",
        "lighting_led_strip_malfunction": "broken led strip lights flickering",
        # Fan
        "fan_not_spinning": "broken ceiling fan motor burnt",
        "fan_broken_blades": "ceiling fan broken blade snapped",
        "fan_smoke_motor": "burnt fan motor smoke damage",
        "fan_loose_wiring": "ceiling fan loose hanging wires",
        # TV
        "tv_black_screen": "broken tv black screen no power",
        "tv_cracked_screen": "cracked tv screen display damage",
        "tv_no_signal": "tv screen no signal error",
        "tv_power_button_not_working": "broken tv power button stuck",
        # Fridge
        "fridge_not_cooling": "spoiled food inside fridge warm",
        "fridge_ice_buildup": "fridge freezer ice buildup frost",
        "fridge_water_leakage": "fridge leaking water floor puddle",
        "fridge_broken_door_seal": "broken fridge door rubber seal",
        # Kitchen
        "kitchen_rice_cooker_not_heating": "broken rice cooker heating plate",
        "kitchen_burnt_heating_plate": "burnt rice cooker bottom plate",
        "kitchen_broken_switch_button": "broken kitchen appliance switch",
        # Washing Machine
        "washing_machine_drum_not_spinning": "washing machine drum stuck broken",
        "washing_machine_water_leakage": "leaking washing machine water floor",
        "washing_machine_control_panel_error": "washing machine error code display",
        # Plumbing
        "plumbing_pipe_leaking": "leaking water pipe burst damage",
        "plumbing_wall_water_leakage_stain": "damp wall water leak stain",
        "plumbing_tap_dripping": "dripping tap water leak",
        "plumbing_under_sink_leakage": "under sink water leak damage",
        "plumbing_shower_not_working": "broken shower head no water",
        "plumbing_blocked_shower_drain": "blocked shower drain water pooling",
        "plumbing_overflowing_toilet_tank": "overflowing toilet tank leak",
        "plumbing_broken_flush_system": "broken toilet flush handle repair",
        "plumbing_blocked_kitchen_sink": "blocked kitchen sink water standing",
        "plumbing_clogged_floor_drain": "clogged floor drain dirty water",
        "plumbing_dirty_water_backup": "sewage water backup drain",
        "plumbing_water_tank_overflow": "rooftop water tank overflow leak",
        "plumbing_broken_water_valve": "broken main water valve leak",
        "plumbing_low_water_pressure_tap": "low water pressure tap dripping",
        # Furniture
        "furniture_broken_chair_leg": "broken chair leg snapped wood",
        "furniture_wobbly_chair": "wobbly chair loose joints",
        "furniture_loose_joints": "loose furniture joints wood",
        "furniture_missing_screws": "furniture missing screws holes",
        "furniture_broken_table_leg": "broken table leg damaged wood",
        "furniture_cracked_wooden_table": "cracked wooden table top split",
        "furniture_unstable_dining_table": "unstable dining table repair",
        "furniture_torn_sofa_fabric": "torn sofa fabric upholstery damage",
        "furniture_sagging_sofa_cushion": "sagging sofa cushions broken springs",
        "furniture_broken_sofa_frame": "broken sofa wood frame snapped",
        "furniture_stained_upholstery": "stained sofa fabric dirt marks",
        "furniture_flat_pack_parts": "flat pack furniture parts assembly",
        "furniture_disassembled_chair_table": "disassembled furniture chair table parts",
        "furniture_installation_process": "furniture assembly installation service"
    }

    print(f"Starting Dataset Download for {len(dataset_tasks)} classes...")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    for folder, query in dataset_tasks.items():
        print(f"\nDownloading for: {folder}...")
        save_path = os.path.join(base_dir, folder)
        if not os.path.exists(save_path):
            os.makedirs(save_path)

        search_url = f"https://www.bing.com/images/search?q={quote_plus(query)}&safeSearch=Off"
        try:
            response = requests.get(search_url, headers=headers, timeout=10)
            html = response.text
            image_urls = re.findall(r'murl&quot;:&quot;(http.*?)&quot;', html)
            
            count = 0
            # Download 30 images per class for better accuracy
            for url in image_urls[:30]: 
                try:
                    img_data = requests.get(url, headers=headers, timeout=5).content
                    if len(img_data) < 2000: continue # Skip tiny/placeholder images
                    with open(os.path.join(save_path, f"img_{count}.jpg"), 'wb') as f:
                        f.write(img_data)
                    count += 1
                    if count % 10 == 0: print(f"  Downloaded {count} images...")
                except:
                    continue
            print(f"Finished {folder}: {count} images saved.")
        except Exception as e:
            print(f"Error downloading {folder}: {e}")

    print("\nDownload Complete! All 53 folders are being populated.")

if __name__ == "__main__":
    download_images()
