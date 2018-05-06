import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { AngularFireAuth } from 'angularfire2/auth';
import { AngularFirestore } from 'angularfire2/firestore';
import { AngularFireStorage } from 'angularfire2/storage';
import { UploadFile } from 'ng-zorro-antd';
import { combineLatest } from 'rxjs/observable/combineLatest';
import { map, mergeMap } from 'rxjs/operators';
import { PostsService } from '../services/posts.service';

@Component({
  selector: 'app-editor-post',
  template: `
    <form nz-form [formGroup]='formGroup'>
      <div nz-form-control>
        <nz-input
          formControlName='content'
          nzType='textarea'
          [nzAutosize]='nzAutosize'
          [nzPlaceHolder]='nzPlaceHolder'
          [nzDisabled]='isMutation'>
        </nz-input>
      </div>
      <div class='actions' nz-form-control>
        <div nz-row nzType="flex" nzJustify="end" nzAlign="middle">
          <nz-upload
            *ngIf='afAuth.authState|async'
            class='input'
            [nzShowUploadList]='false'
            [(nzFileList)]='fileList'>
            <button nz-button>
              <i class='anticon anticon-link'></i>
              <span>画像</span>
            </button>
          </nz-upload>
          <button
            nz-col
            class='input'
            nz-button
            (click)='onAddPost()'
            [nzLoading]='isMutation'>
            <span>送信</span>
          </button>
        </div>
      </div>
      <div *ngIf='fileList[0]' class='images'>
        <nz-avatar
          *ngFor='let file of fileList'
          class='image-avater'
          nzShape='square'
          nzSize='large'
          [nzSrc]='file.thumbUrl'>
        </nz-avatar>
      </div>
    </form>
  `,
  styles: [`
    :host {
      display: block;
      padding: 10px;
      box-sizing: border-box;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    }

    .actions {
      padding-top: 10px;
    }

    .actions .input {
      margin-left: 10px;
    }

    .images {
      padding-top: 8px;
    }

    .images .image-avater {
      display: inline-block;
      vertical-align: top;
      margin-right: 8px;
    }

    .error {
      padding-top: 8px;
    }
  `]
})
export class EditorPostComponent implements OnInit {
  public formGroup: FormGroup;
  public nzAutosize = { minRows: 1, maxRows: 6 };
  public nzPlaceHolder = 'もしもし';
  public fileList: UploadFile[] = [];
  public isMutation = false;

  constructor (
    private formBuilder: FormBuilder,
    private posts: PostsService,
    public afAuth: AngularFireAuth,
    private afStorage: AngularFireStorage,
    private afStore: AngularFirestore) {
  }

  private resetFormGroup () {
    this.formGroup.reset({ content: '' });
    this.fileList = [];
  }

  public get content () {
    return this.formGroup.get('content');
  }

  public onAddPost () {
    if (this.isMutation) {
      return;
    }

    this.isMutation = true;

    this.markAsDirty();

    const content = this.content.value;

    let $mutation = null;

    if (!this.fileList.length && !content) {
      this.isMutation = false;
      return;
    }

    if (this.fileList.length) {
      const uploadImageMap$ = this.fileList.map((file) => {
        return this.uploadImage(file);
      });

      const uploadImages$ = combineLatest(uploadImageMap$);

      const post$ = mergeMap((photoURLs) => {
        return this.posts.addPost({
          content: content,
          photoURLs: photoURLs,
          replyPostId: null
        });
      });

      $mutation = uploadImages$.pipe(post$);
    } else {
      $mutation = this.posts.addPost({
        content: content,
        photoURLs: [],
        replyPostId: null
      });
    }

    $mutation.subscribe(() => {
      this.resetFormGroup();
      this.isMutation = false;
    }, (err) => {
      console.error(err);
      this.isMutation = false;
    });
  }

  public uploadImage (file) {
    const originFileObj = file.originFileObj;
    const photoId = this.afStore.createId();
    const filePath = `posts/${photoId}`;
    const task = this.afStorage.upload(filePath, originFileObj);
    const downloadURL$ = task.downloadURL();
    const map$ = map((photoURL) => {
      return { photoURL, photoId };
    });
    return downloadURL$.pipe(map$);
  }

  public ngOnInit () {
    this.formGroup = this.formBuilder.group({
      content: ['', [Validators.maxLength(200)]]
    });
  }

  private markAsDirty () {
    this.formGroup.controls.content.markAsDirty();
  }
}
