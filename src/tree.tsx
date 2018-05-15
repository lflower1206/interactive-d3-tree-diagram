import * as React from 'react';
import * as d3 from 'd3';

export interface IDatum {
  name: string;
  x?: number;
  y?: number;
  x0?: number; // Stash the old positions for transition.
  y0?: number; // Stash the old positions for transition.
  children?: IDatum[];
  _children?: IDatum[];
}

export interface IHierarchyPointNode<Datum>
  extends d3.HierarchyPointNode<Datum> {
  x0?: number;
  y0?: number;
  _children?: Array<d3.HierarchyPointNode<Datum>>;
}

export interface IMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface IInteractiveTreeProps {
  data: IDatum;
  width: number;
  height: number;
}

export interface IInteractiveTreeState {
  margin: IMargin;
  drawableHeight: number;
  drawableWidth: number;

  canvas?: d3.Selection<SVGGElement, {}, null, undefined>;
  treeData?: IDatum;
  treeLayout?: d3.TreeLayout<IDatum>;
  source?: IHierarchyPointNode<IDatum>;
}

class InteractiveTree extends React.PureComponent<
  IInteractiveTreeProps,
  IInteractiveTreeState
> {
  svg: SVGElement;

  constructor(props: any) {
    super(props);
    this.state = {
      margin: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20,
      },
      drawableHeight: 0,
      drawableWidth: 0,
    };
  }

  componentDidMount() {
    this._init();
  }

  componentDidUpdate() {
    this._paint();
  }

  _init() {
    const { height, width, data } = this.props;
    const { margin } = this.state;
    const drawableHeight = height - margin.top - margin.bottom;
    const drawableWidth = width - margin.left - margin.right;
    const treeLayout = d3.tree<IDatum>().size([drawableWidth, drawableHeight]);

    const treeData = { ...data };

    const root = treeLayout(d3.hierarchy<IDatum>(treeData));
    const nodes = root.descendants() as IHierarchyPointNode<IDatum>[];
    nodes[0].x0 = root.x;
    nodes[0].y0 = 0;
    const source = root;

    const canvas = d3
      .select(this.svg)
      .attr('width', width + margin.right + margin.left)
      .attr('height', height + margin.top + margin.bottom)
      .append<SVGGElement>('g')
      .attr('id', 'canvas')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    this.setState({
      ...this.state,
      ...{
        drawableHeight,
        drawableWidth,
        canvas,
        treeData,
        treeLayout,
        source,
      },
    });
  }

  _paint() {
    const { canvas, treeLayout, treeData, source } = this.state;
    const duration = 750;
    const onNodeClick = this._onNodeClick.bind(this);

    // Compute the new tree layout.
    const root = treeLayout(d3.hierarchy<IDatum>(treeData));
    const links = root.links();
    const nodes = root.descendants() as IHierarchyPointNode<IDatum>[];

    // Normalize for fixed-depth.
    nodes.forEach((d: IHierarchyPointNode<IDatum>) => {
      d.y = d.depth * 60;
    });

    const node = canvas.selectAll('g.node').data(nodes);
    const nodeEnter = node
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', () => `translate(${source.x0}, ${source.y0})`)
      .on('click', onNodeClick);

    nodeEnter
      .append<SVGCircleElement>('circle')
      .attr('class', 'node')
      .attr('r', 0)
      .style('fill', '#4a90e2')
      .style('fill-opacity', 0);

    nodeEnter
      .append<SVGTextElement>('text')
      .attr('x', 13)
      .attr('class', 'label')
      .text((d: any) => d.data.name)
      .style('fill-opacity', 0);

    const nodeUpdate = nodeEnter.merge(node);

    // Transition to the proper position for the nodes
    nodeUpdate
      .transition()
      .duration(duration)
      .attr('transform', d => {
        if (source.data.name === d.data.name) {
          source.x = d.x;
          source.y = d.y;
        }
        return `translate(${d.x}, ${d.y})`;
      });

    // Update the node attributes and style
    nodeUpdate
      .select('circle.node')
      .attr('r', 10)
      .style('fill-opacity', 1)
      .attr('cursor', 'pointer');

    nodeUpdate
      .select('text.label')
      .attr('r', 10)
      .style('fill-opacity', 1)
      .attr('cursor', 'pointer');

    const nodeExit = node
      .exit()
      .transition()
      .duration(duration)
      .attr('transform', () => `translate(${source.x}, ${source.y})`)
      .remove();

    nodeExit.select('circle.circle').attr('r', 0);
    nodeExit.select('text.label').style('fill-opacity', 0);

    const link = canvas
      .selectAll<SVGPathElement, IDatum>('path.link')
      .data(links);
    const linkGenerator = d3
      .linkVertical()
      .x((d: any) => d.x)
      .y((d: any) => d.y);

    const linkEnter = link
      .enter()
      .insert<SVGPathElement>('path', 'g')
      .attr('class', 'link')
      .attr('d', () => {
        const o: any = { x: source.x0, y: source.y0 };
        return linkGenerator({ source: o, target: o });
      })
      .style('fill', 'none')
      .style('stroke', '#d8d8d8')
      .style('stroke-width', '2px');

    // Transition back to the parent element position
    linkEnter
      .merge(link)
      .transition()
      .duration(duration)
      .attr('d', (d: any) => {
        return linkGenerator({ source: d.source, target: d.target });
      });

    // Transition exiting nodes to the parent's new position.
    link
      .exit()
      .transition()
      .duration(duration)
      .attr('d', () => {
        const o: any = { x: source.x, y: source.y };
        return linkGenerator({ source: o, target: o });
      })
      .remove();

    nodes.forEach(function(d) {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  }

  _onNodeClick(source: IHierarchyPointNode<IDatum>) {
    if (source.data.children) {
      source.data._children = source.data.children;
      source.data.children = null;
    } else {
      source.data.children = source.data._children;
      source.data._children = null;
    }

    this.setState({ ...this.state, ...{ source } });
  }

  render() {
    return (
      <svg
        ref={svg => {
          this.svg = svg;
        }}
      />
    );
  }
}

export default InteractiveTree;
