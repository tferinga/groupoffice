/** 
 * Copyright Intermesh
 * 
 * This file is part of Group-Office. You should have received a copy of the
 * Group-Office license along with Group-Office. See the file /LICENSE.TXT
 * 
 * If you have questions write an e-mail to info@intermesh.nl
 * 
 * @version $Id: UserSettingsDialog.js 19225 2015-06-22 15:07:34Z wsmits $
 * @copyright Copyright Intermesh
 * @author Wesley Smits <wsmits@intermesh.nl>
 */
go.usersettings.UserSettingsDialog = Ext.extend(go.Window, {
	
	modal:true,
	resizable:true,
	maximizable:true,
	iconCls: 'ic-settings',
	title: t("Settings"),
	currentUser:null,

	initComponent: function () {
		
		this.saveButton = new Ext.Button({
			text: t('Save'),
			handler: this.submit,
			scope:this
		});
				
		this.formPanel = new Ext.form.FormPanel({
			waitMsgTarget:true,
			region:'center',
			fileUpload: true,
			baseParams : {}
		});
		
		this.tabPanel = new Ext.TabPanel({
			headerCfg: {cls:'x-hide-display'},
			//layout: "card",
			anchor: '100% 100%',
			items: []
		});
		
		this.formPanel.add(this.tabPanel);
		
		
		this.tabStore = new Ext.data.ArrayStore({
			fields: ['name', 'icon', 'visible'],
			data: []
		});
		
		this.selectMenu = new Ext.Panel({
			region:'west',
			cls: 'go-sidenav',
			layout:'fit',
			width:dp(220),
			items:[this.selectView = new Ext.DataView({
				xtype: 'dataview',
				cls: 'go-nav',
				store:this.tabStore,
				singleSelect: true,
				overClass:'x-view-over',
				itemSelector:'div',
				tpl:'<tpl for=".">\
					<div><i class="icon {icon}"></i>\
					<span>{name}</span></div>\
				</tpl>',
				columns: [{dataIndex:'name'}],
				listeners: {
					selectionchange: function(view, nodes) {					
						this.tabPanel.setActiveTab(nodes[0].viewIndex);
					},
					scope:this
				}
			})]
		});
		
		Ext.apply(this,{
			width:dp(1000),
			height:dp(800),
			layout:'border',
			closeAction:'hide',
			items: [
				this.selectMenu,
				this.formPanel
			],
			buttons:[
				this.saveButton
			]
		});
		
		this.addEvents({
			'loadStart' : true,
			'loadComplete' : true,
			'submitStart' : true,
			'submitComplete' : true
		});
		
		go.usersettings.UserSettingsDialog.superclass.initComponent.call(this);
		
		// When the form is loaded, reset the 'modified' state to NOT modified.
		this.formPanel.getForm().trackResetOnLoad  = true;
	},
	
	/**
	 * The show function of this dialog.
	 * This immediately starts loading all tabpanels in this dialog.
	 * 
	 * @param int userId
	 */
	show: function(userId){
		this.currentUser = userId;

		go.usersettings.UserSettingsDialog.superclass.show.call(this);
		
		this.selectView.select(this.tabStore.getAt(0));
		
		this.load();
	},
	
	/**
	 * Initiates the submit function of all tabpanels.
	 * 
	 */
	submit : function(){
		
		if(this.needCurrentPassword()){
			
			var passwordPrompt = new go.PasswordPrompt({
				text: t('Provide your current password to save your user settings.'),
				title: t('Current password required'),
				listeners:{
					'ok': function(value){
						this.internalSubmit(value);
					},
					scope:this
				}
			});

			passwordPrompt.show();
			
		}	else {
			this.internalSubmit();
		}
	},
	
	internalSubmit : function(currentPassword){
		this.actionStart();
		this.fireEvent('submitStart',this);
		
		var id, params = {}, values =  this.formPanel.getForm().getFieldValues(true);
		
		// Check if the password fields are filled in.
		// If not, then remove them from the values array
		
		if(Ext.isEmpty(values.password)){
			delete values.password;
		}
		if(Ext.isEmpty(values.passwordConfirm)){
			delete values.passwordConfirm;
		}
		
		
		// If the currentPassword is set, then add it to the posted values
		if(!Ext.isEmpty(currentPassword)){
			if(!values.password){
				values.password = {};
			}
			values.currentPassword = currentPassword;
		}
		
		// loop through child panels and call onSubmitStart function if available
		this.tabPanel.items.each(function(tab) {
			if(tab.onSubmitStart){
				tab.onSubmitStart(values);
			}
		},this);

		//		//this.id is null when new
		if(this.currentUser) {
			id = this.currentUser;
			params.update = {};
			params.update[this.currentUser] = values;
		} else {			
			id = Ext.id();
			params.create = {};
			params.create[id] = values;
		}

		go.stores.User.set(params, function(options, success, response){
			if(response.notUpdated && response.notUpdated[id] && response.notUpdated[id].validationErrors && response.notUpdated[id].validationErrors.currentPassword){
				// Current password is incorrect.
				this.submit();
				return;
			}
						
			if((params.create && response.created[id])||(params.update && response.updated[id])){
				this.submitComplete(response);
			}

		},this);
	},
	
	
	/**
	 * Check if  password protected tab fields are changed
	 * 
	 * @return boolean
	 */
	needCurrentPassword : function(){
		
		var needed = false;
		
		this.tabPanel.items.each(function(pnl,index,total){
			
			if(pnl.onBeforeNeedCurrentPasswordCheck){
				pnl.onBeforeNeedCurrentPasswordCheck();
			}
			
			if(pnl.passwordProtected){
				needed = this.checkDirty(pnl.getId());
				
				if(needed){
					return false;
				}
			}			
		},this);
		
		if(!needed){
			return false;
		} else {
			return !this.checkCurrentPasswordSet();
		}
	},
	
	checkCurrentPasswordSet : function(){
		return !Ext.isEmpty(this.formPanel.getForm().baseParams.currentPassword);
	},
	
	
	/**
	 * call this function when submitting of all tabs is completed
	 */
	submitComplete: function(result){
		this.fireEvent('submitcomplete',this, result);
		
		// loop through child panels and call onSubmitComplete function if available
		this.tabPanel.items.each(function(tab) {
			if(tab.onSubmitComplete){
				tab.onSubmitComplete(result);
			}
		},this);
		
		this.actionComplete();
		
		//reload group-office
		document.location = BaseHref;
	},
		
	/**
	 * Initiates the load of all tabpanels.
	 * 
	 * @param int userId (Optional)
	 */
	load : function(userId){
		this.currentUser = userId ? userId : this.currentUser;
		
		this.actionStart();
		this.fireEvent('loadstart',this, this.currentUser);
		
		
		
		go.stores.User.get([this.currentUser], function(users){
			this.formPanel.getForm().setValues(users[0]);
			this.loadComplete(users[0]);
		}, this);
		
		// loop through child panels and call onLoadComplete function if available
		this.tabPanel.items.each(function(tab) {

			if(tab.onLoadStart){
				tab.onLoadStart(this.currentUserId);
			}
			
		},this);
	},
	
	/**
	 * call this function when loading of all tabs is completed
	 */
	loadComplete: function(data){
		this.fireEvent('loadcomplete', this, data);
		
		// loop through child panels and call onLoadComplete function if available
		this.tabPanel.items.each(function(tab) {

			if(tab.onLoadComplete){
				tab.onLoadComplete(data);
			}
			
		},this);
		
		this.actionComplete();
	},
	
	/**
	 * Check if the form is valid
	 * 
	 * @return boolean
	 */
	validate: function(){
		return this.formPanel.getForm().isValid();
	},
	
	/**
	 * Get the form fields from the given panel.
	 * When no panelID is given, all form fields are returned.
	 * 
	 * @param string panelID
	 * 
	 * @return [] formfields
	 */
	getFields : function(panelID){
		
		if(!panelID){
			// Return all fields
			return this.formPanel.findByType('field');
		}
		
		// Only return the fields of the given panelID
		return this.tabPanel.getItem(panelID).findByType('field');
	},

	/**
	 * Check if an form item on this panel is marked as dirty
	 * 
	 * @param string panelID
	 * 
	 * @return {Boolean}
	 */
	checkDirty : function(panelID){
		
		var items = this.getFields(panelID);
		var dirty = false;
		
		items.forEach(function(item) {
			item.validate();
			if(item.isDirty()){
				dirty = true;
			}
		});
		
		return dirty;
	},
	
	/**
	 * Add a panel to the tabpanel of this dialog
	 * 
	 * @param string panelID
	 * @param string panelClass
	 * @param object panelConfig
	 * @param int position
	 * @param boolean passwordProtected
	 */
	addPanel : function(panelID, panelClass, position, passwordProtected){
		var cfg = {
			header: false,
			loaded:false,
			submitted:false
		};
		Ext.apply(cfg,{
			id:panelID,
			passwordProtected:passwordProtected
		});
		
		var pnl = new panelClass(cfg);
		
			var menuRec = new Ext.data.Record({
			'name':pnl.title,
			'icon':pnl.iconCls,
			'visible':true
		});
		
		if(Ext.isEmpty(position)){
			this.tabPanel.add(pnl);
			this.tabStore.add(menuRec);
		}else{
			this.tabPanel.insert(position,pnl);
			this.tabStore.insert(position,menuRec);
		}
	},
	
	/**
	 * Call this function when an action is started.
	 * This will disable all action buttons of this window.
	 */
	actionStart : function() {
		if(this.getBottomToolbar()) {
			this.getBottomToolbar().setDisabled(true);
		}
		if(this.getTopToolbar()) {
			this.getTopToolbar().setDisabled(true);
		}
		
		if(this.getFooterToolbar()) {
			this.getFooterToolbar().setDisabled(true);
		}
	},
	
	/**
	 * Call this function when an action is completed.
	 * This will enable all action buttons of this window again.
	 */
	actionComplete : function() {
		if(this.getBottomToolbar()) {
			this.getBottomToolbar().setDisabled(false);
		}
		
		if(this.getTopToolbar()) {
			this.getTopToolbar().setDisabled(false);
		}
		if(this.getFooterToolbar()) {
			this.getFooterToolbar().setDisabled(false);
		}
	}

});

// TODO: This needs to be moved to the correct file
go.EntityManager.register("users", "User");