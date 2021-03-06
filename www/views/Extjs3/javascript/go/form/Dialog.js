/**
 * 
 * Typical usage
 * 
 * var dlg = new Dlg();
 * dlg.load(1).show();
 */

go.form.Dialog = Ext.extend(go.Window, {
	autoScroll: true,
	width: 500,
	modal: true,
	entityStore: null,
	currentId: null,
	buttonAlign: 'left',
	layout: "fit",
	initComponent: function () {

		this.formPanel = new go.form.EntityPanel({
			entityStore: this.entityStore,
			items: this.initFormItems()
		});

		this.items = [this.formPanel];

		if (!this.buttons) {
			this.buttons = [
//			this.deleteBtn = new Ext.Button({
//				text: t("Delete"),
//				cls: 'danger',
//				handler: this.delete,
//				disabled: true,
//				scope: this
//			}), 
				'->', {
					text: t("Save"),
					handler: this.submit,
					scope: this
				}];
		}

		go.form.Dialog.superclass.initComponent.call(this);

		this.entityStore.on('changes', this.onChanges, this);

		this.on('destroy', function () {
			this.entityStore.un('changes', this.onChanges, this);
		}, this);

		//deprecated
		if (this.formValues) {
			this.formPanel.form.setValues(this.formValues);
			delete this.formValues;
		}
	},
	
	setValues : function(v) {
		this.formPanel.form.setValues(v);
		
		return this;
	},

	load: function (id) {
		this.currentId = id;

		if (!this.formPanel.load(id)) {
			//If no entity was returned the entity store will load it and fire the "changes" event. This dialog listens to that event.
			this.actionStart();
		} else
		{
			//needs to fire because overrides are made to handle logic after form load.
			this.onLoad();
		}

		return this;
	},

	onChanges: function (entityStore, added, changed, destroyed) {

		if (changed.concat(added).indexOf(this.currentId) !== -1) {
			this.actionComplete();
			this.onLoad();
		}
	},

	delete: function () {
		
		Ext.MessageBox.confirm(t("Confirm delete"), t("Are you sure you want to delete this item?"), function (btn) {
			if (btn != "yes") {
				return;
			}
			
			this.entityStore.set({destroy: [this.currentId]}, function (options, success, response) {
				if (response.destroyed) {
					this.hide();
				}
			}, this);
		}, this);
	},

	actionStart: function () {
		if (this.getBottomToolbar()) {
			this.getBottomToolbar().setDisabled(true);
		}
		if (this.getTopToolbar()) {
			this.getTopToolbar().setDisabled(true);
		}

		if (this.getFooterToolbar()) {
			this.getFooterToolbar().setDisabled(true);
		}
	},
	
	onLoad : function() {
//		this.deleteBtn.setDisabled(this.formPanel.entity.permissionLevel < GO.permissionLevels.writeAndDelete);
	},

	onSubmit: function (success, serverId) {
		if (success) {
			this.entityStore.entity.goto(serverId);
		}
	},

	actionComplete: function () {
		if (this.getBottomToolbar()) {
			this.getBottomToolbar().setDisabled(false);
		}

		if (this.getTopToolbar()) {
			this.getTopToolbar().setDisabled(false);
		}
		if (this.getFooterToolbar()) {
			this.getFooterToolbar().setDisabled(false);
		}
	},

	isValid: function () {
		return this.formPanel.isValid();
	},

	focus: function () {
		this.formPanel.focus();
	},

	submit: function () {

		if (!this.isValid()) {
			return;
		}

		this.actionStart();

		this.formPanel.submit(function (formPanel, success, serverId) {
			this.actionComplete();
			this.onSubmit(success, serverId);
			if (success) {
				this.close();
			}
		}, this);
	},

	initFormItems: function () {
		return [
//			{
//				xtype: 'textfield',
//				name: 'name',
//				fieldLabel: "Name",
//				anchor: '100%',
//				required: true
//			}
		];
	}
});
