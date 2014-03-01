using System;
using System.IO;
using System.Linq;
using System.Linq.Expressions;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;
using System.Xml.Linq;
using System.Xml;
using System.Collections.Generic;
using System.Text;
using System.Diagnostics;
using System.Windows.Media;

using Styx;
using Styx.Common;
using Styx.Helpers;
using Styx.WoWInternals;
using Styx.WoWInternals.WoWObjects;
using System.Text.RegularExpressions;

using FTWRev;
using FTWRev.data.libs;
using FTWRev.data.libs.util;
using FTWRev.data.libs.core;

namespace FTWRev.data.libs.ui
{
    public class FTWConfig : Form
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        public FTWConfig()
        {
            InitializeComponent();
        }

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.btnInking = new System.Windows.Forms.CheckBox();
            this.btnSave = new System.Windows.Forms.Button();
            this.chkQueueForDungeons = new System.Windows.Forms.CheckBox();
            this.chkAccept = new System.Windows.Forms.CheckBox();
            this.tabControl1 = new System.Windows.Forms.TabControl();
            this.tabPage1 = new System.Windows.Forms.TabPage();
            this.lstOverrides = new System.Windows.Forms.ListView();
            this.colSpellName = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.colSpelID = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.colLastCast = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.colCooldownRemaining = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.tabPage2 = new System.Windows.Forms.TabPage();
            this.lstMyAuras = new System.Windows.Forms.ListView();
            this.colName = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.colStackCount = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.colTimeRemaining = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.tabPage3 = new System.Windows.Forms.TabPage();
            this.lstTargetAuras = new System.Windows.Forms.ListView();
            this.columnHeader1 = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.columnHeader2 = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.columnHeader3 = ((System.Windows.Forms.ColumnHeader)(new System.Windows.Forms.ColumnHeader()));
            this.tabControl1.SuspendLayout();
            this.tabPage1.SuspendLayout();
            this.tabPage2.SuspendLayout();
            this.tabPage3.SuspendLayout();
            this.SuspendLayout();
            // 
            // btnInking
            // 
            this.btnInking.AutoSize = true;
            this.btnInking.Checked = true;
            this.btnInking.CheckState = System.Windows.Forms.CheckState.Checked;
            this.btnInking.Location = new System.Drawing.Point(10, 10);
            this.btnInking.Name = "btnInking";
            this.btnInking.Size = new System.Drawing.Size(200, 17);
            this.btnInking.TabIndex = 1;
            this.btnInking.Text = "Use Scroll Lock to control movement";
            this.btnInking.UseVisualStyleBackColor = true;
            // 
            // btnSave
            // 
            this.btnSave.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Bottom | System.Windows.Forms.AnchorStyles.Right)));
            this.btnSave.Location = new System.Drawing.Point(391, 418);
            this.btnSave.Margin = new System.Windows.Forms.Padding(2, 3, 2, 3);
            this.btnSave.Name = "btnSave";
            this.btnSave.Size = new System.Drawing.Size(56, 21);
            this.btnSave.TabIndex = 2;
            this.btnSave.Text = "Save";
            this.btnSave.UseVisualStyleBackColor = true;
            this.btnSave.Click += new System.EventHandler(this.btnSave_Click);
            // 
            // chkQueueForDungeons
            // 
            this.chkQueueForDungeons.AutoSize = true;
            this.chkQueueForDungeons.Location = new System.Drawing.Point(10, 32);
            this.chkQueueForDungeons.Name = "chkQueueForDungeons";
            this.chkQueueForDungeons.Size = new System.Drawing.Size(186, 17);
            this.chkQueueForDungeons.TabIndex = 3;
            this.chkQueueForDungeons.Text = "Automatically queue for dungeons";
            this.chkQueueForDungeons.UseVisualStyleBackColor = true;
            this.chkQueueForDungeons.CheckedChanged += new System.EventHandler(this.chkQueueForDungeons_CheckedChanged);
            // 
            // chkAccept
            // 
            this.chkAccept.AutoSize = true;
            this.chkAccept.Location = new System.Drawing.Point(10, 54);
            this.chkAccept.Name = "chkAccept";
            this.chkAccept.Size = new System.Drawing.Size(202, 17);
            this.chkAccept.TabIndex = 4;
            this.chkAccept.Text = "Automatically accept dungeon invites";
            this.chkAccept.UseVisualStyleBackColor = true;
            // 
            // tabControl1
            // 
            this.tabControl1.Anchor = ((System.Windows.Forms.AnchorStyles)((((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Bottom)
                        | System.Windows.Forms.AnchorStyles.Left)
                        | System.Windows.Forms.AnchorStyles.Right)));
            this.tabControl1.Controls.Add(this.tabPage1);
            this.tabControl1.Controls.Add(this.tabPage2);
            this.tabControl1.Controls.Add(this.tabPage3);
            this.tabControl1.Location = new System.Drawing.Point(13, 78);
            this.tabControl1.Name = "tabControl1";
            this.tabControl1.SelectedIndex = 0;
            this.tabControl1.Size = new System.Drawing.Size(434, 312);
            this.tabControl1.TabIndex = 5;
            // 
            // tabPage1
            // 
            this.tabPage1.Controls.Add(this.lstOverrides);
            this.tabPage1.Location = new System.Drawing.Point(4, 22);
            this.tabPage1.Name = "tabPage1";
            this.tabPage1.Padding = new System.Windows.Forms.Padding(3);
            this.tabPage1.Size = new System.Drawing.Size(426, 286);
            this.tabPage1.TabIndex = 0;
            this.tabPage1.Text = "Spells";
            this.tabPage1.UseVisualStyleBackColor = true;
            // 
            // lstOverrides
            // 
            this.lstOverrides.Anchor = ((System.Windows.Forms.AnchorStyles)((((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Bottom)
                        | System.Windows.Forms.AnchorStyles.Left)
                        | System.Windows.Forms.AnchorStyles.Right)));
            this.lstOverrides.Columns.AddRange(new System.Windows.Forms.ColumnHeader[] {
            this.colSpellName,
            this.colSpelID,
            this.colLastCast,
            this.colCooldownRemaining});
            this.lstOverrides.Location = new System.Drawing.Point(7, 7);
            this.lstOverrides.Name = "lstOverrides";
            this.lstOverrides.Size = new System.Drawing.Size(413, 273);
            this.lstOverrides.TabIndex = 0;
            this.lstOverrides.UseCompatibleStateImageBehavior = false;
            this.lstOverrides.View = System.Windows.Forms.View.Details;
            // 
            // colSpellName
            // 
            this.colSpellName.Text = "Spell Name";
            this.colSpellName.Width = 120;
            // 
            // colSpelID
            // 
            this.colSpelID.Text = "Spell ID";
            this.colSpelID.Width = 80;
            // 
            // colLastCast
            // 
            this.colLastCast.Text = "Last Cast";
            this.colLastCast.TextAlign = System.Windows.Forms.HorizontalAlignment.Right;
            this.colLastCast.Width = 80;
            // 
            // colCooldownRemaining
            // 
            this.colCooldownRemaining.Text = "Cooldown Remaining";
            this.colCooldownRemaining.TextAlign = System.Windows.Forms.HorizontalAlignment.Right;
            this.colCooldownRemaining.Width = 120;
            // 
            // tabPage2
            // 
            this.tabPage2.Controls.Add(this.lstMyAuras);
            this.tabPage2.Location = new System.Drawing.Point(4, 22);
            this.tabPage2.Name = "tabPage2";
            this.tabPage2.Padding = new System.Windows.Forms.Padding(3);
            this.tabPage2.Size = new System.Drawing.Size(426, 286);
            this.tabPage2.TabIndex = 1;
            this.tabPage2.Text = "My Auras";
            this.tabPage2.UseVisualStyleBackColor = true;
            // 
            // lstMyAuras
            // 
            this.lstMyAuras.Anchor = ((System.Windows.Forms.AnchorStyles)((((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Bottom)
                        | System.Windows.Forms.AnchorStyles.Left)
                        | System.Windows.Forms.AnchorStyles.Right)));
            this.lstMyAuras.Columns.AddRange(new System.Windows.Forms.ColumnHeader[] {
            this.colName,
            this.colStackCount,
            this.colTimeRemaining});
            this.lstMyAuras.Location = new System.Drawing.Point(7, 7);
            this.lstMyAuras.Name = "lstMyAuras";
            this.lstMyAuras.Size = new System.Drawing.Size(413, 273);
            this.lstMyAuras.TabIndex = 1;
            this.lstMyAuras.UseCompatibleStateImageBehavior = false;
            this.lstMyAuras.View = System.Windows.Forms.View.Details;
            // 
            // colName
            // 
            this.colName.Text = "Aura Name";
            this.colName.Width = 200;
            // 
            // colStackCount
            // 
            this.colStackCount.Text = "Stack Count";
            this.colStackCount.TextAlign = System.Windows.Forms.HorizontalAlignment.Right;
            this.colStackCount.Width = 80;
            // 
            // colTimeRemaining
            // 
            this.colTimeRemaining.Text = "Time Remaining";
            this.colTimeRemaining.TextAlign = System.Windows.Forms.HorizontalAlignment.Right;
            this.colTimeRemaining.Width = 120;
            // 
            // tabPage3
            // 
            this.tabPage3.Controls.Add(this.lstTargetAuras);
            this.tabPage3.Location = new System.Drawing.Point(4, 22);
            this.tabPage3.Name = "tabPage3";
            this.tabPage3.Size = new System.Drawing.Size(426, 286);
            this.tabPage3.TabIndex = 2;
            this.tabPage3.Text = "Target Auras";
            this.tabPage3.UseVisualStyleBackColor = true;
            // 
            // lstTargetAuras
            // 
            this.lstTargetAuras.Anchor = ((System.Windows.Forms.AnchorStyles)((((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Bottom)
                        | System.Windows.Forms.AnchorStyles.Left)
                        | System.Windows.Forms.AnchorStyles.Right)));
            this.lstTargetAuras.Columns.AddRange(new System.Windows.Forms.ColumnHeader[] {
            this.columnHeader1,
            this.columnHeader2,
            this.columnHeader3});
            this.lstTargetAuras.Location = new System.Drawing.Point(7, 7);
            this.lstTargetAuras.Name = "lstTargetAuras";
            this.lstTargetAuras.Size = new System.Drawing.Size(413, 273);
            this.lstTargetAuras.TabIndex = 2;
            this.lstTargetAuras.UseCompatibleStateImageBehavior = false;
            this.lstTargetAuras.View = System.Windows.Forms.View.Details;
            // 
            // columnHeader1
            // 
            this.columnHeader1.Text = "Aura Name";
            this.columnHeader1.Width = 200;
            // 
            // columnHeader2
            // 
            this.columnHeader2.Text = "Stack Count";
            this.columnHeader2.TextAlign = System.Windows.Forms.HorizontalAlignment.Right;
            this.columnHeader2.Width = 80;
            // 
            // columnHeader3
            // 
            this.columnHeader3.Text = "Time Remaining";
            this.columnHeader3.TextAlign = System.Windows.Forms.HorizontalAlignment.Right;
            this.columnHeader3.Width = 120;
            // 
            // FTWConfig
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(456, 449);
            this.Controls.Add(this.tabControl1);
            this.Controls.Add(this.chkAccept);
            this.Controls.Add(this.chkQueueForDungeons);
            this.Controls.Add(this.btnSave);
            this.Controls.Add(this.btnInking);
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.Name = "FTWConfig";
            this.ShowIcon = false;
            this.Text = "FightThisWayRevised by Gobias";
            this.FormClosing += new System.Windows.Forms.FormClosingEventHandler(this.FTWConfig_FormClosing);
            this.Load += new System.EventHandler(this.FTWConfig_Load);
            this.tabControl1.ResumeLayout(false);
            this.tabPage1.ResumeLayout(false);
            this.tabPage2.ResumeLayout(false);
            this.tabPage3.ResumeLayout(false);
            this.ResumeLayout(false);
            this.PerformLayout();

        }

        #endregion

        private CheckBox btnInking;
        private CheckBox chkQueueForDungeons;
        private CheckBox chkAccept;
        private TabControl tabControl1;
        private TabPage tabPage1;
        private ListView lstOverrides;
        private ColumnHeader colSpellName;
        private ColumnHeader colSpelID;
        private ColumnHeader colLastCast;
        private ColumnHeader colCooldownRemaining;
        private TabPage tabPage2;
        private TabPage tabPage3;
        private Button btnSave;
        private ListView lstMyAuras;
        private ColumnHeader colName;
        private ColumnHeader colStackCount;
        private ColumnHeader colTimeRemaining;
        private ListView lstTargetAuras;
        private ColumnHeader columnHeader1;
        private ColumnHeader columnHeader2;
        private ColumnHeader columnHeader3;
        private UI.UpdateUIDelegate updateui = null;

        private void btnSave_Click(object sender, EventArgs e)
        {
            Logging.Write(Colors.LightGreen, "FTW Settings Saved");
            FTWProps.UseScrollLock = this.btnInking.Checked;
            DungeonWatcher.AutoAcceptDungeon = this.chkAccept.Checked;
            DungeonWatcher.AutoQueueDungeon = this.chkQueueForDungeons.Checked;
            Close();
        }

        private void chkQueueForDungeons_CheckedChanged(object sender, EventArgs e)
        {

        }

        private void FTWConfig_Load(object sender, EventArgs e)
        {
            updateui = new UI.UpdateUIDelegate(On_Update);
            UI.UpdateUI += updateui;
        }

        private void FTWConfig_FormClosing(object sender, FormClosingEventArgs e)
        {
            UI.UpdateUI -= updateui;
        }

        private void PopulateListview(ListView lvw, List<String[]> values)
        {
            for (int i = 0; i < values.Count; i++)
            {
                ListViewItem lvi = null;
                String[] arr = values[i];
                for (int j = 0; j < lvw.Items.Count; j++)
                {
                    if (arr[0] == lvw.Items[j].SubItems[0].Text)
                    {
                        lvi = lvw.Items[j];
                        break;
                    }
                }

                if (lvi == null)
                {
                    lvi = new ListViewItem(arr[0]);
                    lvw.Items.Add(lvi);
                }

                for (int j = 0; j < arr.Length; j++)
                {
                    if (lvi.SubItems.Count < j+1)
                        lvi.SubItems.Add(arr[j]);
                    else if (lvi.SubItems[j].Text != arr[j])
                        lvi.SubItems[j].Text = arr[j];
                }
            }
        }

        public void On_Update(EventArgs args)
        {
            PopulateListview(lstOverrides, FTWCoreStatus.ListCooldowns());
            PopulateListview(lstMyAuras, FTWCoreStatus.ListMyAuras());
            PopulateListview(lstTargetAuras, FTWCoreStatus.ListTargetAuras());
        }

    }

}






