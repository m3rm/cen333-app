import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'm-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './m-header.component.html',
  styleUrl: './m-header.component.css'
})
export class MHeaderComponent {
  @Input() title: string; 
  @Input() homename: string; 
  private featureList: string[]; 

  constructor(){
    this.title = "";
    this.featureList = [];
    this.homename = "Home";
  }

  @Input()
  set features(value: string[]){
    this.featureList = value; 
  }

  get features(): string[]{
    return this.featureList;
  }

  feature2path(feature: string){
    return feature.replace(/\s+/g, '').toLowerCase();
  }
}
