import { Component, OnInit } from '@angular/core';
import {BrowserModule} from '@angular/platform-browser'

import { AuthService } from '../../../core/services/auth.service';
import { DataService } from '../../../core/services/data.service';
import { Http, Headers, Response, RequestOptions  } from '@angular/http';
import { Observable  } from 'rxjs/Observable';
import { ActivatedRoute,Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Question, Answer } from '../../../shared/objectSchema';
import { NotificationsService } from 'angular2-notifications';

import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-report',
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.scss'],
})
export class ReportComponent implements OnInit {

  tableData: Array<any> = [];
  ProjectList: Array<any> =[];
  ProjectListTab:  Array<any> =[];
  assessmentList: Array<any> = [];
  questionnaires: Array<object>= [];
  answers: Array<Answer> = [];
  allAssignment: Array<object> = [];
  userAssignment: object = {};
  currentProject: object;
  feedbackList: Array<any> = [];
  decline_reason: string;
  hold_reason: string;
  projectStatus: string = ''
  menu: Array<any> = [];
  attachment: Array<any> = [];

  project_info: any = {};
  project_users: any = [];
  address_info: Array<any> = [];

  user: object = {}
  projectID: string;
  dropdownSettings: object;
  dropdownData: Array<object> = [];
  document_menu: any = [];
  activeTab = 'heat_map';
  loading: boolean;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dataService: DataService,
    private authService: AuthService,
    private _notificationService: NotificationsService
  ) {

  }

  public editor;
  public editorContent = ``;
  public editorOptions = {
    placeholder: "insert content..."
  };
  public editor_id = null;
  public editor_type = null;

  openHeatmap(modal){
    modal.open('lg');
  }
  submitHeatmap(modal){
    let heatmap_arr = this.tableData.map(function(item){return item['Heatmap']});
    let data = {
      id: this.currentProject['_id'],
      data: heatmap_arr
    }
    console.log(data)
    this.dataService.updateHeatmap(data).subscribe(
      response => {
          this._notificationService.success(
              'Successfully Saved!',
              'Heatmap'
          )
          modal.close();
      },
      (error) => {
      }
    );
  }
  openModal(modal, id, type){
    modal.open('lg');
    this.editor_id = id;
    this.editor_type = type;
    this.editorContent = this.feedbackList[this.editor_id] || ``;
  }

  updateFeedback(modal){
    this.feedbackList[this.editor_id] = this.editorContent;
    let data = {
      id: this.currentProject['_id'],
      data: { AssignmentID:this.editor_id, Desc: this.editorContent , type: this.editor_type }
    }
    this.dataService.updateProjectFeedback(data).subscribe(
      response => {
        if( this.editor_type == 'default')
        {
          this.currentProject[this.editor_id] = this.feedbackList[this.editor_id];
        }
        else{
          let that = this;
          let obj = this.currentProject['Assessments'].find(function(item){ return item['AssignmentID'] == that.editor_id})
          if( obj )
          {
            obj['Desc'] = this.editorContent;
          }else{
            obj = { AssignmentID : this.editor_id, Desc: this.editorContent, _id: this.currentProject['_id']}
            this.currentProject['Assessments'].push(obj)
          }
        }
      },
      (error) => {
      }
    );
    modal.close()
  }

  releaseReport(){
    let data = {
      id: this.currentProject['_id'],
      data: {
        Status: 'Accept',
        Reason: ''
      }
    }
    this.dataService.updateProjectStatus(data).subscribe(
      response => {
        this.currentProject['Status'] = 'Accept';
        this.projectStatus = 'Accept'
      },
      (error) => {
      }
    );
  }

  openDeclineModal(modal){
    this.decline_reason = '';
    modal.open()
  }
  declineReport(modal){
    let data = {
      id: this.currentProject['_id'],
      data: {
        Status: 'Reject',
        Reason: this.decline_reason
      }
    }
    this.dataService.updateProjectStatus(data).subscribe(
      response => {
        this.currentProject['Status'] = 'Reject';
        this.projectStatus = 'Reject'
      },
      (error) => {
      }
    );
    modal.close()
  }

  openHoldModal(modal){
    this.hold_reason = '';
    modal.open()
  }
  holdReport(modal){
    let data = {
      id: this.currentProject['_id'],
      data: {
        Status: 'Hold',
        Reason: this.hold_reason
      }
    }
    this.dataService.updateProjectStatus(data).subscribe(
      response => {
        this.currentProject['Status'] = 'Hold';
        this.projectStatus = 'Hold'
      },
      (error) => {
      }
    );
    modal.close()
  }


  changeProject(project){
    if(this.projectID != project.Project['_id'])
    {
      this.loading = true;
      this.dropdownData = [];
      this.currentProject = project;
      this.projectStatus = this.currentProject['Status']
      this.projectID = project.Project['_id'];
      this.apiHandler();
    }
  }

  ngOnInit() {
    this.loading = true;
    this.dropdownSettings = {
        singleSelection: false,
        text:'--',
        selectAllText:'Select All',
        unSelectAllText:'UnSelect All',
        enableSearchFilter: false ,
        enableCheckAll: false,
        classes:"cs-dropdown-select custom-class",
      };
    this.dropdownData = []
    this.getSubmittedProject();
  }


  eachSlice(obj, size){
    let arr = []
    for (var i = 0, l = obj.length; i < l; i += size){
      arr.push(obj.slice(i, i + size))
    }
    return arr
  };

  getSubmittedProject(){
    this.dataService.getSubmittedProject().subscribe(response => {
        this.ProjectList = response.result;
        this.currentProject = this.ProjectList[0];
        this.projectStatus = this.currentProject['Status']
        this.projectID = this.currentProject['Project']['_id'];
        this.ProjectListTab = this.eachSlice(this.ProjectList, 4);
        this.apiHandler();
      },
      (error) => {
      }
    );
  }

  apiHandler(){
    this.address_info = [];
    let promiseArr= [];
    promiseArr.push(new Promise((resolve, reject) => {
      this.getAssessment(() => {resolve(); });
    }))

    promiseArr.push(new Promise((resolve, reject) => {
      this.getQuestionnaire(() => {resolve(); });
    }))

    promiseArr.push(new Promise((resolve, reject) => {
      this.getAnswerList(() => {resolve(); });
    }))

    promiseArr.push(new Promise((resolve, reject) => {
      this.getAssignment(() => {resolve(); });
    }))

    promiseArr.push(new Promise((resolve, reject) => {
      this.getProjectUsers(() => {resolve(); });
    }))

    promiseArr.push(new Promise((resolve, reject) => {
      this.getProjectAttachment(() => {resolve(); });
    }))

    promiseArr.push(new Promise((resolve, reject) => {
      this.getCountry(() => {resolve(); });
    }))

    promiseArr.push(new Promise((resolve, reject) => {
      this.getState(() => {resolve(); });
    }))

    promiseArr.push(new Promise((resolve, reject) => {
      this.getCity(() => {resolve(); });
    }))

    Promise.all(promiseArr).then(() => {
      this.getTableData();
    });
  }

  getProjectAttachment(resolve){
    let data = {id: this.projectID}
    this.dataService.getProjectAttachment(data).subscribe(
      response => {
        this.attachment = response.result;
        resolve();
      },
      (error) => {

      }
    );
  }

  getProjectUsers(resolve){
    let data = {id: this.projectID}
    this.dataService.getProjectUsers(data).subscribe(
      response => {
        this.project_users = response.result;
        resolve();
      },
      (error) => {

      }
    );
  }

  getCountry(resolve){
    let data = {id: this.currentProject['Project']['Company']['Country']}
    this.dataService.getCountryItem(data).subscribe(
      response => {
        this.address_info['Country'] = response.result;
        resolve();
      },
      (error) => {

      }
    );
  }

  getState(resolve)
  {
    let data = {id: this.currentProject['Project']['Company']['State']}
    this.dataService.getStateItem(data).subscribe(
      response => {
        this.address_info['State'] = response.result;
        resolve();
      },
      (error) => {
      }
    );
  }

  getCity(resolve)
  {
    let data = {id: this.currentProject['Project']['Company']['City']}
    this.dataService.getCityItem(data).subscribe(
      response => {
        this.address_info['City'] = response.result;
        resolve();
      },
      (error) => {
      }
    );
  }

  getFeedbackList(){
    this.feedbackList = [];
    this.feedbackList['Methdology'] = this.currentProject['Methdology'] || '';
    this.feedbackList['Executive'] = this.currentProject['Executive'] || '';
    this.feedbackList['HeatMap'] = this.currentProject['HeatMap'] || '';
    this.feedbackList['Document'] = this.currentProject['Document'] || '';
    for(let item of this.currentProject['Assessments'])
    {
      this.feedbackList[item['AssignmentID']] = item['Desc'];
    }
  }

  getAssessment(resolve){
    console.log(this.currentProject)
    this.getFeedbackList();
    this.dataService.getAssessmentList(this.projectID).subscribe(response => {
        this.assessmentList = response.Categories;
        resolve()
      },
      (error) => {

      }
    );
  }

  getQuestionnaire(resolve){
    this.dataService.getQAList().subscribe(
      response => {
        this.questionnaires = response.result;
        resolve();
      },
      (error) => {
      }
    );
  }

  getAnswerList(resolve){
    let data = {Project: this.projectID}
    this.dataService.getAnswerList(data).subscribe(
      response => {
        this.answers = response.result;
        resolve()
      },
      (error) => {
      }
    );
  }

  getAssignment(resolve){
    let parma = { projectID: this.projectID}
    this.dataService.getAssignment(parma).subscribe(
      response => {
        this.allAssignment = response.result;
        resolve();
      },
      (error) => {
      }
    );
  }

  findAnswerObject(uuid, appID = null){
    for(let answer of this.answers) {
      if(answer['Questionnaire'] == uuid)
        return answer
      for(let answer_item of answer['Answers']) {
        if(answer_item.uuid == uuid)
          return answer_item;
      }
    }
    return null;
  }

  findAnswerValue(uuid, object)
  {
    let result = []
    for(let item of object['Items'])
    {
      if(item['uuid'] == uuid)
        result.push(item)
    }
    return result;
  }

  getGroupPercent(arr)
  {
    let completedCnt = 0;
    let percent = '0';
    arr.forEach(function(item){
      if(item == 2 || item == 0)
        completedCnt += 1;
    })
    if(completedCnt)
      percent = (completedCnt / arr.length * 100).toFixed(0);
    return percent;
  }

  getGroupStatus(arr)
  {
    let status = 1;
    if(arr.length)
    {
      if(arr.every(function(item){  return item == 2 || item == 0}))
        status = 2;
      if(arr.every(function(item){  return item == 0}))
        status = 0;
    }
    return status;
  }

  getFileUrl(file){
    let url = file.Url;
    if( file.SourceType == 'Computer' )
      url = environment.serverUrl + '/' + url;
    return url;
  }
  recursiveUpdate(entries)
  {
    for(let entry of entries)
    {
      let questionArr = [];
      let question = this.questionnaires.find(function(elem){
        return elem['category_id'] == entry['uuid']
      })

      let hasDetail = false;
      let statusArr = [];
      let attachmentList = [];
      if( question && question['questions'].length )
      {
        hasDetail = true;
        for( let question_entry of question['questions'])
        {
          let answer_item = this.findAnswerObject(question_entry['uuid']);
          if(answer_item)
            attachmentList = attachmentList.concat(this.attachment.filter(function(item){ return item['AssignmentID'] == answer_item['uuid']}));
          let appIDArr = [];
          let question_value = null;
          let status = answer_item && typeof answer_item['Status'] != 'undefined' ? answer_item['Status'] : 1;
          statusArr.push(status)
          question_value = (answer_item && answer_item['value']) ? answer_item['value'] : '';

          if(question_entry['Type'] == 'Grid')
          {
            question_value = {};
            if(answer_item)
            {
              answer_item['Items'].every(function(item){
                if(appIDArr.indexOf(item['appID']) == -1)
                  appIDArr.push(item['appID'])
                question_value[item['appID'] + '_' + item['uuid']] = item['value'];
                return true;
              })
            }
          }
          if(question_entry['Type'] == 'Dropdown')
          {
            if(!this.dropdownData[question_entry.uuid])
              this.dropdownData[question_entry.uuid] = { Content: [], Selected: []}
          }
          for(let question_entry_item of question_entry['Items'])
          {
            let answer_value_item = [];
            if(answer_item)
              answer_value_item = this.findAnswerValue(question_entry_item['uuid'], answer_item);
            if(question_entry['Type'] == 'Dropdown')
            {
              this.dropdownData[question_entry.uuid]['Content'].push({"id":question_entry_item.uuid,"itemName":question_entry_item.Text})
              if(question_value && question_value.split(",").indexOf(question_entry_item.uuid) != -1)
              {
                this.dropdownData[question_entry.uuid]['Selected'].push({"id":question_entry_item.uuid,"itemName":question_entry_item.Text})
                question_entry_item['value'] = true;
              }else{
                question_entry_item['value'] = false;
              }
            }
            if(question_entry['Type'] != 'Grid' && question_entry['Type'] != 'Dropdown')
            {
              question_entry_item['value'] = answer_value_item.length ? answer_value_item[0].value : '';
            }
          }

          let question_item = { id: question_entry['uuid'], status: status, desc: question_entry['Label'], appIDs:appIDArr, value: question_value, items:question_entry['Items'],  type: question_entry['Type'], hasDocument: question_entry['HasDocument'], filename: "test.xls"}
          questionArr.push(question_item)
        }
      }
      let groupStatus = this.getGroupStatus(statusArr);

      let groupUUID = question && question['_id'] ? question['_id'] : null;
      let item = { id: entry['uuid'], uuid: groupUUID, title: entry['Title'], hasDetail: hasDetail, status: groupStatus,  open: true, questionArr: questionArr, attachments: attachmentList}
      entry['hasChildren'] = entry.children && entry.children.length;
      entry['expanded'] = false;
      entry['type'] = 'assessment';
      this.tableData.push(item)
      if(entry.children.length)
      {
        this.recursiveUpdate(entry.children)
      }
    }
  }

  updateSidebarList(){
    this.menu = []
    for(let item of this.assessmentList)
    {
        this.menu = this.menu.concat(item.children)
    }
    // this.menu = this.assessmentList;
  }

  getCompanyInfo(){
    let that = this;
    this.project_info =  Object.assign({}, this.currentProject['Project']['Company']);
    this.project_info['Project_Name'] = this.currentProject['Project']['Name'];
    this.project_info['Company_Name'] = this.currentProject['Project']['Company']['Name'];

    this.project_info['Country'] = this.address_info['Country'] ? this.address_info['Country']['label'] : '';
    this.project_info['State'] = this.address_info['State'] ? this.address_info['State']['label'] : '';
    this.project_info['City'] = this.address_info['City'] ? this.address_info['City']['label'] : '';

    this.project_info['Industry'] = this.menu.map(function(item){ return item['Title']});
    this.project_info['Annual_Revvenue'] = this.currentProject['Reason2'] && this.currentProject['Reason2']['tAnnualRev'] ? this.currentProject['Reason2']['tAnnualRev'] : 'NA';
    this.project_info['Number_Employee'] = this.currentProject['Reason2'] && this.currentProject['Reason2']['tEmpNo'] ? this.currentProject['Reason2']['tEmpNo'] : 'NA';
    this.project_info['Years_Business'] = 'NA';
    this.project_info['Start_Date'] = this.currentProject['Project']['createdAt'];
    this.project_info['End_Date'] = this.currentProject['createdAt'];
    this.project_info['Review_Date'] = this.currentProject['updatedAt'];

    let PrimaryUser = this.project_users.find(function(item){ return item['Role'] == 'PRIMARY'});
    this.project_info['Primary_User'] = PrimaryUser ? PrimaryUser['User']['Name']['Fullname'] : 'NA';
    let TeamUsers = this.project_users.filter(function(item){ return item['Role'] == 'MEMBER'});
    if(TeamUsers)
    {
      let tmp = TeamUsers.map(function(item){ return item['User']['Name']['Fullname']});
      this.project_info['Team_Users'] = tmp.join(", ");
    }else
    {
      this.project_info['Team_Users'] = 'NA';
    }
  }

  getHeatMap(){
    for(let item of this.tableData){
      let heatmap_item = this.currentProject['Heatmap'].find(function(h_item){ return h_item['AssignmentID'] == item.id});
      item['Heatmap'] = heatmap_item || { AssignmentID : item.id};
    }
  }

  getTableData(){
    this.tableData = [];
    this.menu = [];
    this.recursiveUpdate(this.assessmentList[0]['children'])
    this.updateSidebarList();
    this.getCompanyInfo();
    this.getHeatMap();
    console.log(this.menu)
    console.log(this.tableData)
    this.loading = false;
  }
}
