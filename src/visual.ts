/*
 *  Power BI Visual CLI
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

module powerbi.extensibility.visual 
{
    "use strict";

    let GlobalDiv : HTMLDivElement;

    let GlobalSvgElement : d3.Selection<SVGElement>;

    let GlobalConstructorOptions : VisualConstructorOptions;

    let GlobalUpdateOptions : VisualUpdateOptions;

    let TempData=
    [
        {
            label:"Basic",
            value:100,
            color:"#3366CC"
        },
        {
            label:"Plus",
            value:200,
            color:"#DC3912"
        },
        {
            label:"Lite",
            value:150,
            color:"#FF9900"
        },
        {
            label:"Elite",
            value:200,
            color:"#109618"
        },
        {
            label:"Delux",
            value:250,
            color:"#990099"
        }
    ];

    let RealData : any;

    export class Visual implements IVisual 
    {
        private target: any;
        private settings: VisualSettings;

        constructor(options: VisualConstructorOptions) 
        {
            console.log('Visual constructor', options);
            this.target = options.element;
            GlobalDiv = this.target;

            GlobalSvgElement = d3.select(GlobalDiv).append("svg");
            GlobalSvgElement.append("g").attr("id","Donut1");
        }

        public update(options: VisualUpdateOptions) 
        {
            this.settings = Visual.parseSettings(options && options.dataViews && options.dataViews[0]);
            console.log('Visual update', options);
            
            GlobalUpdateOptions = options;

            if(GlobalUpdateOptions.dataViews[0].table.columns.length == 3)
            {
                var indices : IndexClass[] = Visual.IdentifyColumnIndices(GlobalUpdateOptions);
                console.log("The Indices ",indices);
                RealData = Visual.ExtractData(GlobalUpdateOptions,indices);
                console.log("The Real Data ",RealData);
            }
            else
            {
                RealData = TempData;
            }

            Visual.ShowDonut3D();
        }

        private static parseSettings(dataView: DataView): VisualSettings 
        {
            return VisualSettings.parse(dataView) as VisualSettings;
        }

        /** 
         * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the 
         * objects and properties you want to expose to the users in the property pane.
         * 
         */
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject 
        {
            return VisualSettings.enumerateObjectInstances(this.settings || VisualSettings.getDefault(), options);
        }

        private static IdentifyColumnIndices(UpdateOptions : VisualUpdateOptions) : IndexClass[]
        {
            var ResultData : IndexClass[] = [];

            for (let index = 0; index < UpdateOptions.dataViews[0].metadata.columns.length; index++) 
            {
                var col : any = UpdateOptions.dataViews[0].metadata.columns[index];

                var temp : IndexClass = new IndexClass();
                temp.ColumnIndex = index;

                if(col.displayName == "LabelName" || col.displayName == "CostPrice" || col.displayName == "LabelColor")//Column Names from the dataset
                {
                    temp.ColumnName = col.displayName;
                    ResultData.push(temp);
                }
            }

            return ResultData;
        }

        private static ExtractData(UpdateOptions : VisualUpdateOptions, Indices : IndexClass[]) : DonutDataClass[]
        {
            var ResultData : DonutDataClass[] = [];

            var LabelIndex : number;
            var ValueIndex : number;
            var ColorIndex : number;

            var rows : DataViewTableRow[] = UpdateOptions.dataViews[0].table.rows;
            
            for (var x = 0; x < Indices.length; x++) 
            {
                if(Indices[x].ColumnName == "LabelName")
                    LabelIndex = Indices[x].ColumnIndex;
                else if(Indices[x].ColumnName == "CostPrice")
                    ValueIndex = Indices[x].ColumnIndex;
                else if(Indices[x].ColumnName == "LabelColor")
                    ColorIndex = Indices[x].ColumnIndex;
            }

            for(var i = 0; i < rows.length; ++i)
            {
                var row : DataViewTableRow = rows[i];

                var TempObj : DonutDataClass = new DonutDataClass();
                TempObj.label = <string>row[LabelIndex];
                TempObj.value = <number>row[ValueIndex];
                TempObj.color = <string>row[ColorIndex];

                ResultData.push(TempObj);
            }

            return ResultData;
        }

        private static ShowDonut3D() : void
        {
            let vw = GlobalUpdateOptions.viewport.width;
            let vh = GlobalUpdateOptions.viewport.height;

            let donutradius = Math.min(vw, vh)/2 - 50;

            GlobalSvgElement.attr({width : vw, height : vh});

            Visual.Donut3D("Donut1", RealData, vw/2, vh/2, donutradius + 30, donutradius, 30, 0.4);
        }

        private static Donut3D(id : string, VisualData : any, x : number, y : number, rx : number, ry : number, h : number, ir : number) : void
        {
            function pieTop(d, rx, ry, ir )
            {
                if(d.endAngle - d.startAngle == 0 ) return "M 0 0";
                var sx = rx*Math.cos(d.startAngle),
                    sy = ry*Math.sin(d.startAngle),
                    ex = rx*Math.cos(d.endAngle),
                    ey = ry*Math.sin(d.endAngle);
                    
                var ret =[];
                ret.push("M",sx,sy,"A",rx,ry,"0",(d.endAngle-d.startAngle > Math.PI? 1: 0),"1",ex,ey,"L",ir*ex,ir*ey);
                ret.push("A",ir*rx,ir*ry,"0",(d.endAngle-d.startAngle > Math.PI? 1: 0), "0",ir*sx,ir*sy,"z");
                return ret.join(" ");
            }
            
            function pieOuter(d, rx, ry, h )
            {
                var startAngle = (d.startAngle > Math.PI ? Math.PI : d.startAngle);
                var endAngle = (d.endAngle > Math.PI ? Math.PI : d.endAngle);
                
                var sx = rx*Math.cos(startAngle),
                    sy = ry*Math.sin(startAngle),
                    ex = rx*Math.cos(endAngle),
                    ey = ry*Math.sin(endAngle);
                    
                    var ret =[];
                    ret.push("M",sx,h+sy,"A",rx,ry,"0 0 1",ex,h+ey,"L",ex,ey,"A",rx,ry,"0 0 0",sx,sy,"z");
                    return ret.join(" ");
            }
            
            function pieInner(d, rx, ry, h, ir )
            {
                var startAngle = (d.startAngle < Math.PI ? Math.PI : d.startAngle);
                var endAngle = (d.endAngle < Math.PI ? Math.PI : d.endAngle);
                
                var sx = ir*rx*Math.cos(startAngle),
                    sy = ir*ry*Math.sin(startAngle),
                    ex = ir*rx*Math.cos(endAngle),
                    ey = ir*ry*Math.sin(endAngle);
            
                    var ret =[];
                    ret.push("M",sx, sy,"A",ir*rx,ir*ry,"0 0 1",ex,ey, "L",ex,h+ey,"A",ir*rx, ir*ry,"0 0 0",sx,h+sy,"z");
                    return ret.join(" ");
            }
            
            function getPercent(d)
            {
                return (d.endAngle-d.startAngle > 0.2 ? 
                        Math.round(1000*(d.endAngle-d.startAngle)/(Math.PI*2))/10+'%' : '');
            }	

            function transition(id, data, rx, ry, h, ir)
            {
                function arcTweenInner(a) 
                {
                  var i = d3.interpolate(this._current, a);
                  this._current = i(0);
                  return function(t) { return pieInner(i(t), rx+0.5, ry+0.5, h, ir);  };
                }

                function arcTweenTop(a) 
                {
                  var i = d3.interpolate(this._current, a);
                  this._current = i(0);
                  return function(t) { return pieTop(i(t), rx, ry, ir);  };
                }

                function arcTweenOuter(a) 
                {
                  var i = d3.interpolate(this._current, a);
                  this._current = i(0);
                  return function(t) { return pieOuter(i(t), rx-.5, ry-.5, h);  };
                }

                // function textTweenX(a) 
                // {
                //   var i = d3.interpolate(this._current, a);
                //   this._current = i(0);
                //   return function(t) { return 0.6*rx*Math.cos(0.5*(i(t).startAngle+i(t).endAngle));  };
                // }

                // function textTweenY(a) 
                // {
                //   var i = d3.interpolate(this._current, a);
                //   this._current = i(0);
                //   return function(t) { return 0.6*rx*Math.sin(0.5*(i(t).startAngle+i(t).endAngle));  };
                // }
                    
                var _data = d3.layout.pie().sort(null).value(function(d:any) {return d.value;})(data);
                    
                d3.select("#"+id).selectAll(".innerSlice").data(_data)
                    .transition().duration(750).attrTween("d", arcTweenInner); 
                    
                d3.select("#"+id).selectAll(".topSlice").data(_data)
                    .transition().duration(750).attrTween("d", arcTweenTop); 
                        
                d3.select("#"+id).selectAll(".outerSlice").data(_data)
                    .transition().duration(750).attrTween("d", arcTweenOuter); 	
                        
                // d3.select("#"+id).selectAll(".percent").data(_data).transition().duration(750)
                //     .attrTween("x",<any>textTweenX).attrTween("y",<any>textTweenY).text(getPercent); 	
            }
                
            function draw(id, data, x , y, rx, ry, h, ir)
            {
                
                var _data = d3.layout.pie().sort(null).value(function(d:any) {return d.value;})(data);
                
                d3.selectAll(".slices").remove();

                var slices = d3.select("#"+id).append("g")
                    .attr("transform", "translate(" + x + "," + y + ")")
                    .attr("class", "slices");

                d3.selectAll(".innerSlice").remove();
                        
                slices.selectAll(".innerSlice").data(_data).enter().append("path").attr("class", "innerSlice")
                    .style("fill", <any>function(d:any) { return d3.hsl(d.data.color).darker(0.7); })
                    .attr("d",function(d){ return pieInner(d, rx+0.5,ry+0.5, h, ir);})
                    .each(function(d){this._current=d;});

                d3.selectAll(".topSlice").remove();
                    
                slices.selectAll(".topSlice").data(_data).enter().append("path").attr("class", "topSlice")
                    .style("fill", function(d:any) { return d.data.color; })
                    .style("stroke", function(d:any) { return d.data.color; })
                    .attr("d",function(d){ return pieTop(d, rx, ry, ir);})
                    .each(function(d){this._current=d;});

                d3.selectAll(".outerSlice").remove();
                    
                slices.selectAll(".outerSlice").data(_data).enter().append("path").attr("class", "outerSlice")
                    .style("fill", <any>function(d:any) { return d3.hsl(d.data.color).darker(0.7); })
                    .attr("d",function(d){ return pieOuter(d, rx-.5,ry-.5, h);})
                    .each(function(d){this._current=d;});

                d3.selectAll(".percent").remove();
            
                slices.selectAll(".percent").data(_data).enter().append("text").attr("class", "percent")
                    .attr("x",function(d){ return 0.6*rx*Math.cos(0.5*(d.startAngle+d.endAngle));})
                    .attr("y",function(d){ return 0.6*ry*Math.sin(0.5*(d.startAngle+d.endAngle));})
                    .text(getPercent).each(function(d){this._current=d;});				
            }

            draw(id,VisualData,x, y, rx, ry, h, ir);
        }
    }

    class IndexClass
    {
        ColumnName : string;
        ColumnIndex : number;
    }

    class DonutDataClass
    {
        label : string;
        value : number;
        color : string; //hex values
    }
}