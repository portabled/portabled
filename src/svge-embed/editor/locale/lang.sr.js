/*globals svgEditor */
svgEditor.readLang({
	lang: "sr",
	dir : "ltr",
	common: {
		"ok": "Ð¡Ð°Ñ‡ÑƒÐ²Ð°Ñ‚Ð¸",
		"cancel": "ÐžÑ‚ÐºÐ°Ð¶Ð¸",
		"key_backspace": "backspace", 
		"key_del": "delete", 
		"key_down": "down", 
		"key_up": "up", 
		"more_opts": "More Options",
		"url": "URL",
		"width": "Width",
		"height": "Height"
	},
	misc: {
		"powered_by": "Powered by"
	}, 
	ui: {
		"toggle_stroke_tools": "Show/hide more stroke tools",
		"palette_info": "ÐšÐ»Ð¸ÐºÐ½Ð¸Ñ‚Ðµ Ð´Ð° Ð±Ð¸ÑÑ‚Ðµ Ð¿Ñ€Ð¾Ð¼ÐµÐ½Ð¸Ð»Ð¸ Ð±Ð¾Ñ˜Ñƒ Ð¿Ð¾Ð¿ÑƒÐ½Ðµ, Ð¡Ñ…Ð¸Ñ„Ñ‚-ÐºÐ»Ð¸ÐºÐ½Ð¸Ñ‚Ðµ Ð´Ð° Ð¿Ñ€Ð¾Ð¼ÐµÐ½Ð¸Ñ‚Ðµ Ð±Ð¾Ñ˜Ñƒ ÑƒÐ´Ð°Ñ€",
		"zoom_level": "ÐŸÑ€Ð¾Ð¼ÐµÐ½Ð¸Ñ‚Ðµ Ð½Ð¸Ð²Ð¾ Ð·ÑƒÐ¼Ð¸Ñ€Ð°ÑšÐ°",
		"panel_drag": "Drag left/right to resize side panel"
	},
	properties: {
		"id": "Identify the element",
		"fill_color": "ÐŸÑ€Ð¾Ð¼ÐµÐ½Ð° Ð±Ð¾Ñ˜Ðµ Ð¿Ð¾Ð¿ÑƒÐ½Ðµ",
		"stroke_color": "ÐŸÑ€Ð¾Ð¼ÐµÐ½Ð° Ð±Ð¾Ñ˜Ðµ ÑƒÐ´Ð°Ñ€",
		"stroke_style": "ÐŸÑ€Ð¾Ð¼ÐµÐ½Ð° Ñ…Ð¾Ð´ Ð”Ð°ÑÑ… ÑÑ‚Ð¸Ð»",
		"stroke_width": "ÐŸÑ€Ð¾Ð¼ÐµÐ½Ð° ÑƒÐ´Ð°Ñ€Ð° ÑˆÐ¸Ñ€Ð¸Ð½Ð°",
		"pos_x": "Change X coordinate",
		"pos_y": "Change Y coordinate",
		"linecap_butt": "Linecap: Butt",
		"linecap_round": "Linecap: Round",
		"linecap_square": "Linecap: Square",
		"linejoin_bevel": "Linejoin: Bevel",
		"linejoin_miter": "Linejoin: Miter",
		"linejoin_round": "Linejoin: Round",
		"angle": "ÐŸÑ€Ð¾Ð¼ÐµÐ½Ð¸ Ñ€Ð¾Ñ‚Ð°Ñ†Ð¸Ñ˜Ðµ Ð£Ð³Ð°Ð¾",
		"blur": "Change gaussian blur value",
		"opacity": "ÐŸÑ€Ð¾Ð¼ÐµÐ½Ð° Ð¸Ð·Ð°Ð±Ñ€Ð°Ð½Ðµ ÑÑ‚Ð°Ð²ÐºÐµ Ð½ÐµÐ¿Ñ€Ð¾Ð·Ð¸Ñ€Ð½Ð¾ÑÑ‚",
		"circle_cx": "ÐŸÑ€Ð¾Ð¼ÐµÐ½Ð° ÐºÑ€ÑƒÐ³&#39;Ñ Ð¦ÐšÐ¡ ÐºÐ¾Ð¾Ñ€Ð´Ð¸Ð½Ð°Ñ‚Ð½Ð¸",
		"circle_cy": "ÐŸÑ€Ð¾Ð¼ÐµÐ½Ð° ÐºÑ€ÑƒÐ³&#39;Ñ ÑÑ€ ÐºÐ¾Ð¾Ñ€Ð´Ð¸Ð½Ð°Ñ‚Ð½Ð¸",
		"circle_r": "ÐŸÑ€Ð¾Ð¼ÐµÐ½Ð° ÐºÑ€ÑƒÐ³Ð° Ñ˜Ðµ Ð¿Ð¾Ð»ÑƒÐ¿Ñ€ÐµÑ‡Ð½Ð¸Ðº",
		"ellipse_cx": "ÐŸÑ€Ð¾Ð¼ÐµÐ½Ð° ÐµÐ»Ð¸Ð¿ÑÐ° Ð¦ÐšÐ¡&#39;Ñ ÐºÐ¾Ð¾Ñ€Ð´Ð¸Ð½Ð°Ñ‚Ð½Ð¸",
		"ellipse_cy": "ÐŸÑ€Ð¾Ð¼ÐµÐ½Ð° ÐµÐ»Ð¸Ð¿ÑÐ°&#39;Ñ ÑÑ€ ÐºÐ¾Ð¾Ñ€Ð´Ð¸Ð½Ð°Ñ‚Ð½Ð¸",
		"ellipse_rx": "ÐŸÑ€Ð¾Ð¼ÐµÐ½Ð° ÐµÐ»Ð¸Ð¿ÑÐ°&#39;Ñ ÐšÑ Ñ€Ð°Ð´Ð¸Ñ˜ÑƒÑÐ°",
		"ellipse_ry": "ÐŸÑ€Ð¾Ð¼ÐµÐ½Ð° ÐµÐ»Ð¸Ð¿ÑÐ° Ñ˜Ðµ Ñ€Ð°Ð´Ð¸Ñ˜ÑƒÑ Ð«",
		"line_x1": "ÐŸÑ€Ð¾Ð¼ÐµÐ½Ð° Ð»Ð¸Ð½Ð¸Ñ˜Ð° Ð¡Ñ‚Ð°Ñ€Ñ‚Ð½Ð¸ ÐºÑ ÐºÐ¾Ð¾Ñ€Ð´Ð¸Ð½Ð°Ñ‚Ð°",
		"line_x2": "ÐŸÑ€Ð¾Ð¼ÐµÐ½Ð° Ð»Ð¸Ð½Ð¸Ñ˜Ð° Ñ˜Ðµ Ð·Ð°Ð²Ñ€ÑˆÐµÑ‚Ð°Ðº ÐºÑ ÐºÐ¾Ð¾Ñ€Ð´Ð¸Ð½Ð°Ñ‚Ð°",
		"line_y1": "ÐŸÑ€Ð¾Ð¼ÐµÐ½Ð° Ð»Ð¸Ð½Ð¸Ñ˜Ð° Ñƒ ÐºÐ¾Ð¾Ñ€Ð´Ð¸Ð½Ð°Ñ‚Ð½Ð¸ Ð¿Ð¾Ñ‡ÐµÑ‚Ð°Ðº Ð«",
		"line_y2": "ÐŸÑ€Ð¾Ð¼ÐµÐ½Ð° Ð»Ð¸Ð½Ð¸Ñ˜Ð° Ñ˜Ðµ Ð« ÐºÐ¾Ð¾Ñ€Ð´Ð¸Ð½Ð°Ñ‚Ð° ÑÐµ Ð·Ð°Ð²Ñ€ÑˆÐ°Ð²Ð°",
		"rect_height": "ÐŸÑ€Ð¾Ð¼ÐµÐ½Ð¸ Ð¿Ñ€Ð°Ð²Ð¾ÑƒÐ³Ð°Ð¾Ð½Ð¸Ðº Ð²Ð¸ÑÐ¸Ð½Ð°",
		"rect_width": "ÐŸÑ€Ð¾Ð¼ÐµÐ½Ð¸ Ð¿Ñ€Ð°Ð²Ð¾ÑƒÐ³Ð°Ð¾Ð½Ð¸Ðº ÑˆÐ¸Ñ€Ð¸Ð½Ðµ",
		"corner_radius": "ÐŸÑ€Ð¾Ð¼ÐµÐ½Ð° Ð¿Ñ€Ð°Ð²Ð¾ÑƒÐ³Ð°Ð¾Ð½Ð¸Ðº ÐšÑƒÑ‚Ð°Ðº Ñ€Ð°Ð´Ð¸Ñ˜ÑƒÑÐ°",
		"image_width": "ÐŸÑ€Ð¾Ð¼ÐµÐ½Ð¸ ÑÐ»Ð¸ÐºÑƒ ÑˆÐ¸Ñ€Ð¸Ð½Ðµ",
		"image_height": "ÐŸÑ€Ð¾Ð¼ÐµÐ½Ð¸ ÑÐ»Ð¸ÐºÑƒ Ð²Ð¸ÑÐ¸Ð½Ðµ",
		"image_url": "ÐŸÑ€Ð¾Ð¼ÐµÐ½Ð¸Ñ‚Ðµ Ð£Ð Ð› Ð°Ð´Ñ€ÐµÑÑƒ",
		"node_x": "Change node's x coordinate",
		"node_y": "Change node's y coordinate",
		"seg_type": "Change Segment type",
		"straight_segments": "Straight",
		"curve_segments": "Curve",
		"text_contents": "ÐŸÑ€Ð¾Ð¼ÐµÐ½Ð° ÑÐ°Ð´Ñ€Ð¶Ð°Ñ˜Ð° Ñ‚ÐµÐºÑÑ‚ÑƒÐ°Ð»Ð½Ðµ",
		"font_family": "Ð¦Ñ…Ð°Ð½Ð³Ðµ Ñ„Ð¾Ð½Ñ‚ Ð¿Ð¾Ñ€Ð¾Ð´Ð¸Ñ†Ñƒ",
		"font_size": "Ð¦Ñ…Ð°Ð½Ð³Ðµ Ñ„Ð¾Ð½Ñ‚ ÑÐ¸Ð·Ðµ",
		"bold": "ÐŸÐ¾Ð´ÐµÐ±Ñ™Ð°Ð½ Ñ‚ÐµÐºÑÑ‚",
		"italic": "Ð˜Ñ‚Ð°Ð»Ð¸Ñ† Ñ‚ÐµÐºÑÑ‚"
	},
	tools: { 
		"main_menu": "Main Menu",
		"bkgnd_color_opac": "ÐŸÑ€Ð¾Ð¼ÐµÐ½Ð° Ð±Ð¾Ñ˜Ðµ Ð¿Ð¾Ð·Ð°Ð´Ð¸Ð½Ðµ / Ð½ÐµÐ¿Ñ€Ð¾Ð·Ð¸Ñ€Ð½Ð¾ÑÑ‚",
		"connector_no_arrow": "No arrow",
		"fitToContent": "Ð¡Ñ‚Ð°Ð½Ðµ Ð½Ð° ÑÐ°Ð´Ñ€Ð¶Ð°Ñ˜",
		"fit_to_all": "Ð£ÐºÐ»Ð¾Ð¿Ð¸ Ñƒ ÑÐ°Ð² ÑÐ°Ð´Ñ€Ð¶Ð°Ñ˜",
		"fit_to_canvas": "Ð¡Ñ‚Ð°Ð½Ðµ Ð½Ð° Ð¿Ð»Ð°Ñ‚Ð½Ñƒ",
		"fit_to_layer_content": "Ð£ÐºÐ»Ð¾Ð¿Ð¸ Ñƒ ÑÐ»Ð¾Ñ˜Ñƒ ÑÐ°Ð´Ñ€Ð¶Ð°Ñ˜",
		"fit_to_sel": "Ð£ÐºÐ»Ð¾Ð¿Ð¸ Ñƒ Ð¸Ð·Ð±Ð¾Ñ€",
		"align_relative_to": "ÐÐ»Ð¸Ð³Ð½ Ñƒ Ð¾Ð´Ð½Ð¾ÑÑƒ Ð½Ð° ...",
		"relativeTo": "Ñƒ Ð¾Ð´Ð½Ð¾ÑÑƒ Ð½Ð°:",
		"ÑÑ‚Ñ€Ð°Ð½Ð°": "ÑÑ‚Ñ€Ð°Ð½Ð°",
		"largest_object": "ÐÐ°Ñ˜Ð²ÐµÑ›Ð¸ Ð¾Ð±Ñ˜ÐµÐºÐ°Ñ‚",
		"selected_objects": "Ð¸Ð·Ð°Ð±Ñ€Ð°Ð½Ð¸Ñ… Ð¾Ð±Ñ˜ÐµÐºÐ°Ñ‚Ð°",
		"smallest_object": "ÐÐ°Ñ˜Ð¼Ð°ÑšÐ¸ Ð¾Ð±Ñ˜ÐµÐºÐ°Ñ‚",
		"new_doc": "ÐÐ¾Ð²Ð° ÑÐ»Ð¸ÐºÐ°",
		"open_doc": "ÐžÑ‚Ð²Ð¾Ñ€Ð¸ ÑÐ»Ð¸ÐºÐµ",
		"export_img": "Export",
		"save_doc": "Ð¡Ð°Ñ‡ÑƒÐ²Ð°Ñ˜ ÑÐ»Ð¸ÐºÐ°",
		"import_doc": "Import Image",
		"align_to_page": "Align Element to Page",
		"align_bottom": "ÐŸÐ¾Ñ€Ð°Ð²Ð½Ð°Ñ˜ Ð´Ð¾Ð»Ðµ",
		"align_center": "ÐŸÐ¾Ñ€Ð°Ð²Ð½Ð°Ñ˜ Ð¿Ð¾ Ñ†ÐµÐ½Ñ‚Ñ€Ñƒ",
		"align_left": "ÐŸÐ¾Ñ€Ð°Ð²Ð½Ð°Ñ˜ Ð»ÐµÐ²Ð¾",
		"align_middle": "ÐÐ»Ð¸Ð³Ð½ Ð¡Ñ€ÐµÐ´ÑšÐ¸",
		"align_right": "ÐŸÐ¾Ñ€Ð°Ð²Ð½Ð°Ñ˜ Ð´ÐµÑÐ½Ð¾",
		"align_top": "ÐŸÐ¾Ñ€Ð°Ð²Ð½Ð°Ñ˜Ñ‚Ðµ Ð²Ñ€Ñ…",
		"mode_select": "Ð˜Ð·Ð°Ð±ÐµÑ€Ð¸Ñ‚Ðµ Ð°Ð»Ð°Ñ‚ÐºÑƒ",
		"mode_fhpath": "ÐÐ»Ð°Ñ‚ÐºÐ° Ð¾Ð»Ð¾Ð²ÐºÐ°",
		"mode_line": "Ð›Ð¸Ð½Ð¸Ñ˜Ð° ÐÐ»Ð°Ñ‚",
		"mode_connect": "Connect two objects",
		"mode_rect": "Rectangle Tool",
		"mode_square": "Square Tool",
		"mode_fhrect": "Ð¤Ñ€ÐµÐµ-Ð ÑƒÑ‡Ð½Ð¸ Ð¿Ñ€Ð°Ð²Ð¾ÑƒÐ³Ð°Ð¾Ð½Ð¸Ðº",
		"mode_ellipse": "Ð•Ð»Ð¸Ð¿ÑÐ°",
		"mode_circle": "ÐšÑ€ÑƒÐ³",
		"mode_fhellipse": "Ð¤Ñ€ÐµÐµ-Ð ÑƒÑ‡Ð½Ð¸ Ð•Ð»Ð¸Ð¿ÑÐ°",
		"mode_path": "Path Tool",
		"mode_shapelib": "Shape library",
		"mode_text": "Ð¢ÐµÐºÑÑ‚ ÐÐ»Ð°Ñ‚",
		"mode_image": "ÐÐ»Ð°Ñ‚ÐºÐ° Ð·Ð° ÑÐ»Ð¸ÐºÐµ",
		"mode_zoom": "ÐÐ»Ð°Ñ‚ÐºÐ° Ð·Ð° Ð·ÑƒÐ¼Ð¸Ñ€Ð°ÑšÐµ",
		"mode_eyedropper": "Eye Dropper Tool",
		"no_embed": "NOTE: This image cannot be embedded. It will depend on this path to be displayed",
		"undo": "ÐŸÐ¾Ð½Ð¸ÑˆÑ‚Ð¸",
		"redo": "Ð ÐµÐ´Ð¾",
		"tool_source": "Ð£Ñ€ÐµÐ´Ð¸ Ð˜Ð·Ð²Ð¾Ñ€",
		"wireframe_mode": "Wireframe Mode",
		"toggle_grid": "Show/Hide Grid",
		"clone": "Clone Element(s)",
		"del": "Delete Element(s)",
		"group_elements": "Ð“Ñ€ÑƒÐ¿Ð° Ð•Ð»ÐµÐ¼ÐµÐ½Ñ‚Ð¸",
		"make_link": "Make (hyper)link",
		"set_link_url": "Set link URL (leave empty to remove)",
		"to_path": "Convert to Path",
		"reorient_path": "Reorient path",
		"ungroup": "Ð Ð°Ð·Ð³Ñ€ÑƒÐ¿Ð¸Ñ€Ð°ÑšÐµ Ð•Ð»ÐµÐ¼ÐµÐ½Ñ‚Ð¸",
		"docprops": "ÐžÑÐ¾Ð±Ð¸Ð½Ðµ Ð´Ð¾ÐºÑƒÐ¼ÐµÐ½Ñ‚Ð°",
		"imagelib": "Image Library",
		"move_bottom": "ÐŸÑ€ÐµÐ¼ÐµÑÑ‚Ð¸ Ð½Ð° Ð´Ð¾Ð»Ðµ",
		"move_top": "ÐŸÑ€ÐµÐ¼ÐµÑÑ‚Ð¸ Ð½Ð° Ð²Ñ€Ñ…",
		"node_clone": "Clone Node",
		"node_delete": "Delete Node",
		"node_link": "Link Control Points",
		"add_subpath": "Add sub-path",
		"openclose_path": "Open/close sub-path",
		"source_save": "Ð¡Ð°Ñ‡ÑƒÐ²Ð°Ñ‚Ð¸",
		"cut": "Cut",
		"copy": "Copy",
		"paste": "Paste",
		"paste_in_place": "Paste in Place",
		"delete": "Delete",
		"group": "Group",
		"move_front": "Bring to Front",
		"move_up": "Bring Forward",
		"move_down": "Send Backward",
		"move_back": "Send to Back"
	},
	layers: {
		"layer":"Layer",
		"layers": "Layers",
		"del": "Ð˜Ð·Ð±Ñ€Ð¸ÑˆÐ¸ ÑÐ»Ð¾Ñ˜",
		"move_down": "ÐŸÐ¾Ð¼ÐµÑ€Ð¸ ÑÐ»Ð¾Ñ˜ Ð´Ð¾Ð»Ðµ",
		"new": "ÐÐ¾Ð²Ð¸ ÑÐ»Ð¾Ñ˜",
		"rename": "ÐŸÑ€ÐµÐ¸Ð¼ÐµÐ½ÑƒÑ˜ ÑÐ»Ð¾Ñ˜",
		"move_up": "ÐŸÐ¾Ð¼ÐµÑ€Ð¸ ÑÐ»Ð¾Ñ˜ Ð“Ð¾Ñ€Ðµ",
		"dupe": "Duplicate Layer",
		"merge_down": "Merge Down",
		"merge_all": "Merge All",
		"move_elems_to": "Move elements to:",
		"move_selected": "Move selected elements to a different layer"
	},
	config: {
		"image_props": "Image Properties",
		"doc_title": "Title",
		"doc_dims": "Canvas Dimensions",
		"included_images": "Included Images",
		"image_opt_embed": "Embed data (local files)",
		"image_opt_ref": "Use file reference",
		"editor_prefs": "Editor Preferences",
		"icon_size": "Icon size",
		"language": "Language",
		"background": "Editor Background",
		"editor_img_url": "Image URL",
		"editor_bg_note": "Note: Background will not be saved with image.",
		"icon_large": "Large",
		"icon_medium": "Medium",
		"icon_small": "Small",
		"icon_xlarge": "Extra Large",
		"select_predefined": "Ð˜Ð·Ð°Ð±ÐµÑ€Ð¸Ñ‚Ðµ ÑƒÐ½Ð°Ð¿Ñ€ÐµÐ´ Ð´ÐµÑ„Ð¸Ð½Ð¸ÑÐ°Ð½Ð¸:",
		"units_and_rulers": "Units & Rulers",
		"show_rulers": "Show rulers",
		"base_unit": "Base Unit:",
		"grid": "Grid",
		"snapping_onoff": "Snapping on/off",
		"snapping_stepsize": "Snapping Step-Size:",
		"grid_color": "Grid color"
	},
	shape_cats: {
		"basic": "Basic",
		"object": "Objects",
		"symbol": "Symbols",
		"arrow": "Arrows",
		"flowchart": "Flowchart",
		"animal": "Animals",
		"game": "Cards & Chess",
		"dialog_balloon": "Dialog balloons",
		"electronics": "Electronics",
		"math": "Mathematical",
		"music": "Music",
		"misc": "Miscellaneous",
		"raphael_1": "raphaeljs.com set 1",
		"raphael_2": "raphaeljs.com set 2"
	},
	imagelib: {
		"select_lib": "Select an image library",
		"show_list": "Show library list",
		"import_single": "Import single",
		"import_multi": "Import multiple",
		"open": "Open as new document"
	},
	notification: {
		"invalidAttrValGiven":"Invalid value given",
		"noContentToFitTo":"No content to fit to",
		"dupeLayerName":"There is already a layer named that!",
		"enterUniqueLayerName":"Please enter a unique layer name",
		"enterNewLayerName":"Please enter the new layer name",
		"layerHasThatName":"Layer already has that name",
		"QmoveElemsToLayer":"Move selected elements to layer '%s'?",
		"QwantToClear":"Do you want to clear the drawing?\nThis will also erase your undo history!",
		"QwantToOpen":"Do you want to open a new file?\nThis will also erase your undo history!",
		"QerrorsRevertToSource":"There were parsing errors in your SVG source.\nRevert back to original SVG source?",
		"QignoreSourceChanges":"Ignore changes made to SVG source?",
		"featNotSupported":"Feature not supported",
		"enterNewImgURL":"Enter the new image URL",
		"defsFailOnSave": "NOTE: Due to a bug in your browser, this image may appear wrong (missing gradients or elements). It will however appear correct once actually saved.",
		"loadingImage":"Loading image, please wait...",
		"saveFromBrowser": "Select \"Save As...\" in your browser to save this image as a %s file.",
		"noteTheseIssues": "Also note the following issues: ",
		"unsavedChanges": "There are unsaved changes.",
		"enterNewLinkURL": "Enter the new hyperlink URL",
		"errorLoadingSVG": "Error: Unable to load SVG data",
		"URLloadFail": "Unable to load from URL",
		"retrieving": "Retrieving \"%s\"..."
	},
	confirmSetStorage: {
		message: "By default and where supported, SVG-Edit can store your editor "+
		"preferences and SVG content locally on your machine so you do not "+
		"need to add these back each time you load SVG-Edit. If, for privacy "+
		"reasons, you do not wish to store this information on your machine, "+
		"you can change away from the default option below.",
		storagePrefsAndContent: "Store preferences and SVG content locally",
		storagePrefsOnly: "Only store preferences locally",
		storagePrefs: "Store preferences locally",
		storageNoPrefsOrContent: "Do not store my preferences or SVG content locally",
		storageNoPrefs: "Do not store my preferences locally",
		rememberLabel: "Remember this choice?",
		rememberTooltip: "If you choose to opt out of storage while remembering this choice, the URL will change so as to avoid asking again."
	}
});