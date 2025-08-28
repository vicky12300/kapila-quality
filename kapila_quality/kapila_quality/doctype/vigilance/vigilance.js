frappe.ui.form.on("Vigilance", {
    onload: function(frm) {
        // Default image
        show_default_image(frm);
    },
    refresh: function(frm) {
        // Bind video links with delay to ensure DOM is ready
        setTimeout(() => {
            bind_video_links(frm);
        }, 100);
    }
});

// Also bind when videos child table is refreshed
frappe.ui.form.on("Vigilance Videos", {
    videos_add: function(frm) {
        setTimeout(() => {
            bind_video_links(frm);
        }, 100);
    },
    videos_remove: function(frm) {
        setTimeout(() => {
            bind_video_links(frm);
        }, 100);
    }
});

function show_default_image(frm){
    let image_url = "/assets/kapila_quality/images/default.jpg";
    frm.set_df_property("image", "options", `
        <div style="text-align:center; margin-bottom:10px;">
            <img src="${image_url}" width="380" height="200" style="border:1px solid #ccc; border-radius:5px;" />
        </div>
    `);
}


// Reusable function to show video popup
function show_video_popup(file_url) {
    if (!file_url.startsWith("http")) {
        file_url = window.location.origin + file_url;
    }
    // Close previous dialog if exists
    if (window.video_dialog) {
        window.video_dialog.hide();
        window.video_dialog.$wrapper.remove();
    }
    let d = new frappe.ui.Dialog({
        title: "Video Preview",
        size: "small", // Changed from "large" to "small"
        primary_action_label: "Close",
        primary_action: () => d.hide()
    });
    
    // Add custom styling for compact video player
    d.$body.append(`
        <div style="max-width: 400px; margin: 0 auto;">
            <video id="popup_video" width="100%" height="250" controls muted style="border-radius: 5px;">
                <source src="${file_url}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        </div>
    `);
    
    // Custom CSS for smaller dialog
    d.$wrapper.find('.modal-dialog').css({
        'max-width': '450px',
        'width': '95%'
    });
    
    d.show();
    window.video_dialog = d;
    // Wait a short time to ensure the video element is in the DOM
    setTimeout(() => {
        const video_el = d.$body.find("#popup_video")[0];
        if (video_el) {
            video_el.play().catch(err => {
                console.warn("Autoplay prevented:", err);
            });
        }
    }, 50); // 50ms delay ensures DOM is rendered
}

// Fixed function to bind click event on video links in child table
function bind_video_links(frm) {
    // Check if the videos field exists
    if (!frm.fields_dict["videos"] || !frm.fields_dict["videos"].grid) {
        return;
    }
    
    // More specific selector and event delegation
    const grid_wrapper = frm.fields_dict["videos"].grid.wrapper;
    
    // Unbind ALL previous click handlers first
    grid_wrapper.off("click.video_links");
    
    // Use namespaced event and event delegation for better reliability
    grid_wrapper.on("click.video_links", ".grid-row a[href*='/files/']", function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        let href = $(this).attr("href");
        if (href && href.includes("/files/")) {
            show_video_popup(href);
        }
    });
    
    // Alternative approach - direct binding to existing links
    grid_wrapper.find("a[href*='/files/']").each(function() {
        $(this).off("click.video_popup").on("click.video_popup", function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            let href = $(this).attr("href");
            if (href && href.includes("/files/")) {
                show_video_popup(href);
            }
        });
    });
}

// Additional fix: Re-bind when grid is rendered
frappe.ui.form.on("Vigilance", {
    videos_on_form_rendered: function(frm) {
        bind_video_links(frm);
    }
});

// Monitor for dynamic content changes
$(document).ready(function() {
    // Re-bind when any grid content changes
    $(document).on('DOMNodeInserted', '.grid-body', function() {
        // Small delay to ensure content is fully rendered
        setTimeout(() => {
            if (cur_frm && cur_frm.doctype === "Vigilance") {
                bind_video_links(cur_frm);
            }
        }, 200);
    });
});