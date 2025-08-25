frappe.ui.form.on("Vigilance Videos", {   // 👈 replace with your child table doctype name
    video_file: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!row.video_file) return;

        // Create absolute URL
        let file_url = row.video_file;
        if (!file_url.startsWith("http")) {
            file_url = window.location.origin + file_url;
        }

        // Show video in dialog
        let d = new frappe.ui.Dialog({
            title: "Video Preview",
            size: "large",
            primary_action_label: "Close",
            primary_action: () => d.hide()
        });

        d.$body.append(`
            <video width="100%" height="auto" controls autoplay>
                <source src="${file_url}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        `);

        d.show();
    }
});
