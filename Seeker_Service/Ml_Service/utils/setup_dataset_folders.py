import os

def create_folders():
    base_dir = os.path.dirname(os.path.abspath(__file__)) + "/../dataset"
    
    # Define all the granular classes based on the user's specification
    classes = [
        # Electrical - Lighting
        "lighting_flickering_bulb",
        "lighting_broken_bulb_holder",
        "lighting_ceiling_light_not_working",
        "lighting_led_strip_malfunction",
        # Electrical - Fan
        "fan_not_spinning",
        "fan_broken_blades",
        "fan_smoke_motor",
        "fan_loose_wiring",
        # Electrical - TV
        "tv_black_screen",
        "tv_cracked_screen",
        "tv_no_signal",
        "tv_power_button_not_working",
        # Electrical - Fridge
        "fridge_not_cooling",
        "fridge_ice_buildup",
        "fridge_water_leakage",
        "fridge_broken_door_seal",
        # Electrical - Kitchen
        "kitchen_rice_cooker_not_heating",
        "kitchen_burnt_heating_plate",
        "kitchen_broken_switch_button",
        # Electrical - Washing Machine
        "washing_machine_drum_not_spinning",
        "washing_machine_water_leakage",
        "washing_machine_control_panel_error",
        # Plumbing - Leakage
        "plumbing_pipe_leaking",
        "plumbing_wall_water_leakage_stain",
        "plumbing_tap_dripping",
        "plumbing_under_sink_leakage",
        # Plumbing - Bathroom
        "plumbing_shower_not_working",
        "plumbing_blocked_shower_drain",
        "plumbing_overflowing_toilet_tank",
        "plumbing_broken_flush_system",
        # Plumbing - Drainage
        "plumbing_blocked_kitchen_sink",
        "plumbing_clogged_floor_drain",
        "plumbing_dirty_water_backup",
        # Plumbing - Water system
        "plumbing_water_tank_overflow",
        "plumbing_broken_water_valve",
        "plumbing_low_water_pressure_tap",
        # Furniture - Chair
        "furniture_broken_chair_leg",
        "furniture_wobbly_chair",
        "furniture_loose_joints",
        "furniture_missing_screws",
        # Furniture - Table
        "furniture_broken_table_leg",
        "furniture_cracked_wooden_table",
        "furniture_unstable_dining_table",
        # Furniture - Sofa
        "furniture_torn_sofa_fabric",
        "furniture_sagging_sofa_cushion",
        "furniture_broken_sofa_frame",
        "furniture_stained_upholstery",
        # Furniture - Assembly
        "furniture_flat_pack_parts",
        "furniture_disassembled_chair_table",
        "furniture_installation_process"
    ]

    splits = ['training', 'validation']

    for split in splits:
        for class_name in classes:
            dir_path = os.path.join(base_dir, split, class_name)
            os.makedirs(dir_path, exist_ok=True)
            print(f"Created: {dir_path}")

    print("\nAll granular dataset folders created successfully!")
    print("Please organize your images into these specific folders before training.")

if __name__ == "__main__":
    create_folders()
