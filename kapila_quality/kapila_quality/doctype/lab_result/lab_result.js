frappe.ui.form.on('Lab Result', {
    tag_name: function(frm) {
        if (frm.doc.tag_name) {
            frappe.call({
                method: "kapila_quality.kapila_quality.doctype.lab_result.lab_result.get_details_from_tag",
                args: {
                    tag_name: frm.doc.tag_name
                },
                callback: function(r) {
                    if (r.message) {
                        console.log("r.message :: " , r.message);
                        frm.set_value("vigilance_reference", r.message.vigilance_reference);
                        frm.set_value("material", r.message.material);
                        frm.set_value("lab_user", frappe.session.user);

                        frm.clear_table("parameter_ratings");
                        (r.message.parameters || []).forEach(param => {
                            let row = frm.add_child("parameter_ratings");
                            row.parameter = param.parameter;
                            row.parameter_name = param.parameter_name;
                        });
                        frm.refresh_field("parameter_ratings");
                    } else {
                        frappe.msgprint("No Vigilance record found for this Tag.");
                    }
                }
            });
        }
    }
});

