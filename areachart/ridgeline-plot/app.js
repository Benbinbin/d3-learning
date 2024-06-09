// 参考自 https://observablehq.com/@d3/ridgeline-plot

/**
 *
 * 构建 svg
 *
 */
const container = document.getElementById("container"); // 图像的容器

// 获取尺寸大小
const width = container.clientWidth; // 宽度
const height = container.clientHeight; // 高度
// margin 为前缀的参数
// 其作用是在 svg 的外周留白，构建一个显示的安全区，以便在四周显示坐标轴
const marginTop = 40;
const marginRight = 20;
const marginBottom = 30;
const marginLeft = 120;

// 创建 svg
// 在容器 <div id="container"> 元素内创建一个 SVG 元素
// 返回一个选择集，只有 svg 一个元素
const svg = d3
  .select("#container")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", [0, 0, width, height]);

/**
 *
 * 异步获取数据
 * 再在回调函数中执行绘制操作
 *
 */
// 数据来源网页 https://observablehq.com/@d3/ridgeline-plot 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/0cec682329f9c230ebf14f1dfa0d60e8/raw/828da4a85c3eb3c3f8a56da4f6c681c8a7ae6580/traffic.csv";

d3.csv(dataURL, d3.autoType).then((traffic) => {
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  console.log(traffic);

  /**
   *
   * 对数据进行转换
   *
   */
  // 使用 D3 的内置方法 d3.group(iterable, ...keys) 对展平的数组进行分组转换
  // 第一参数是需要分组的可迭代对象，即「扁平」的数组（非内嵌式的数组）
  // 第二个参数 ...keys 是一系列返回分组依据的函数，数据集中的每个元素都会调用该函数，入参就是当前遍历的元素 d
  // 该方法返回一个 InterMap 对象（即映射，其中键名是分组依据，而相应的值是在原始数组中属于该分组的元素）
  // 具体可以参考官方文档 https://d3js.org/d3-array/group#group
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process#分组
  // 在这里基于时间点 d => +d.data 对数据集 traffic 进行分组，然后通过调用方法 InterMap.keys() 返回一个 map 迭代器，包含所有键名（即数据集中的所有不同的时间点）
  // 再使用 JS 数组的原生方法 Array.from() 将 map 迭代器转换为数组
  // 然后再使用 JS 数组的原生方法 array.sort(compareFn) 进行排序，其中对比函数采用 D3 内置的对比器 d3.ascending(a, b) 实现升序排列（时间转换为毫秒后，值较大的排在后面）
  const dates = Array.from(d3.group(traffic, d => +d.date).keys()).sort(d3.ascending);
  // 然后使用 D3 的内置方法 d3.groups(iterable, ...keys) 对展平的数组进行分组转换
  // 第一参数是需要分组的可迭代对象，即「扁平」的数组（非内嵌式的数组）
  // 第二个参数 d => d.name 是分组依据，基于每个元素（对象）的 name 属性
  // 该方法返回一个数组，其中每一个元素就是一个分组，因为共有 38 个不同名称的地点，所以共有 38 个元素/分组/系列
  // 该数组的每一个元素都以一个二元数组来表示
  // 在二元数组中，第一个元素就是该分组所属的 key 属性值，在该示例中就是地点的名称；第二元素则是一个数组，其中包含了属于该系列/分组的数据集中的元素
  // 具体可以参考官方文档 https://d3js.org/d3-array/group#groups
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process#分组
  // 然后使用 JS 数组的原生方法 array.map() 对数组进行转换
  // 最终转换所得的数组的每个元素都是一个对象，具有属性 name 和 value
  // 属性 name 表示该系列的名称（即地名）
  // 属性 values 是一个数组，其中每个元素都是一个数字，表示车流量（按照时间的先后排列）
  const series = d3.groups(traffic, d => d.name).map(([name, values]) => {
    // values 是一个数组，它包含原始数据集中属于当前所遍历系列的元素
    // 首先使用 JS 数组原生方法 array.map() 对数组 values 进行转换
    // values.map(d => [+d.date, d.value]) 表示将每个元素由原本的对象形式转换为二元数组的形式，且只保留时间（并转换为数值）+d.data 和车流量 d.value 两类信息（舍去 d.name 所属的地点，因为该信息已经作为分组依据/系列名称，该信息变得冗余了）
    // 然后通过方法 new Map(arr) 将数组转换为映射，其中键名是时间，而对应的值就是相应的车流量
    const value = new Map(values.map(d => [+d.date, d.value]));
    // 最后返回一个对象
    // 属性 name 系列名称（即当前所遍历的地点）
    // 属性 values 是基于数组 dates 去读取当前地点在相应时间的车流量，这样就可以构建出一个仅含有车流量的数组（且它们是按照时间先后顺序排列）
    return {name, values: dates.map(d => value.get(d))};
  });

  /**
   *
   * 构建比例尺
   *
   */
  // 设置横坐标轴的比例尺
  // 横坐标轴的数据是日期（时间），使用 d3.scaleTime 构建一个时间比例尺（连续型比例尺的一种）
  // 该时间比例尺采用地方时，处于不同时区的用户也会显示不同的时间
  // 具体可以参考官方文档 https://d3js.org/d3-scale/time
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#时间比例尺-time-scales
  const x = d3.scaleTime()
      // 设置定义域范围
      // 基于数组 dates（包含一系列时间点），使用用 d3.extent() 计算出它的范围
      .domain(d3.extent(dates))
      // 设置值域范围（所映射的可视元素）
      // svg 元素的宽度（减去留白区域）
      .range([marginLeft, width - marginRight]);

  // 设置山脊图的纵坐标轴的比例尺（针对整体，用于将各个面积图在纵向定位）
  // 在山脊图中多个面积图纵向铺开，在纵坐标轴上分别对应标注出不同地点，使用 d3.scalePoint 构建一个点状比例尺
  // 该比例尺将基于定义域数组的离散元素（不同的地名）的数量，将值域的范围分割为等距的各段，各个分隔点与定义域中的离散元素依次映射
  // 点状比例尺 Point Scales 和带状比例尺类似，就像是将 band 的宽度设置为 0
  // 具体可以参考官方文档 https://d3js.org/d3-scale/point
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#点状比例尺-point-scales
  const y = d3.scalePoint()
      // 设置定义域范围，参数是一个数组，包含所需映射的系列名称
      // 使用 JS 数组的原生方法 array.map() 对数组 series 进行处理
      // 提取出各系列的名称（地名） d.name 构成一个新的数组
      .domain(series.map(d => d.name))
      // 设置值域范围
      // svg 元素的高度（减去留白区域）
      .range([marginTop, height - marginBottom]);

  const overlap = 8; // 控制面积图之间的重叠程度
  // 设置面积图的纵坐标轴比例尺（针对各个面积图，用于计算它们的上边界线的纵坐标值）
  // 面积图的纵轴数据是连续型的数值（车流量），使用 d3.scaleLinear 构建一个线性比例尺
  const z = d3.scaleLinear()
      // 设置定义域范围
      // [0, ymax] 其中 ymax 是车流量的最大值
      // 首先使用 d3.max(d.values) 计算当前所遍历的系列的各个时间点的车流量中的最大值
      // 然后再一次使用 d3.max() 计算所有系列中的最大值
      // 并使用 continuous.nice() 方法编辑定义域的范围，通过四舍五入使其两端的值更「整齐」nice
      .domain([0, d3.max(series, d => d3.max(d.values))]).nice()
      // 设置值域范围
      // 定义域的最小值都映射到 0，定义域的最大值都映射到 -overlap*y.step()
      // 其中 y 是点状比例尺，调用方法 y.step() 返回步长，即分隔点之间的距离
      // 而 overlap 是前面所定义的一个变量，调节/控制相邻面积图之间的重叠程度
      // ⚠️ 根据 svg 的坐标系统，左上角才是坐标 (0,0)，而向右和向下是正方向（坐标值为正值）
      // 所以在前面添加的负号 -overlap * y.step() 表示经过比例尺 z 映射后，各面积图的上边界线都是负值，即它们都是朝上的
      // 💡 最初各个面积图都是定位到 svg 的顶部，它们的（y 值）都是在 [0， -overlap*y.step] 范围中，即最大占据的空间/高度是 overlap*y.step
      // 然后它们会根据 y 比例尺重定位到点状比例尺的分隔点上，形成垂直排布
      // 如果 overlap=1 则各个面积图所占据的（最大）纵向空间正好是 y.step() 分隔点的间距，所以相邻面积图之间不会重叠；如果 overlap > 1 则面积图占据的纵空间比点状比例尺的间隔更大，则相邻面积图之间就可能发生重叠
      .range([0, -overlap * y.step()]);

  /**
   *
   * 绘制坐标轴
   *
   */
  // 绘制横坐标轴
  svg.append("g")
  // 通过设置 CSS 的 transform 属性将横坐标轴容器「移动」到底部
  .attr("transform", `translate(0,${height - marginBottom})`)
  // 横轴是一个刻度值朝下的坐标轴
  .call(d3.axisBottom(x)
      // 通过 axis.ticks(count) 设置刻度数量的参考值（避免刻度过多导致刻度值重叠而影响图表的可读性）
      .ticks(width / 80)
      // 而且将坐标轴的外侧刻度 tickSizeOuter 长度设置为 0（即取消坐标轴首尾两端的刻度）
      .tickSizeOuter(0));
// 💡 注意以上使用的是方法 selection.call(axis) 的方式来调用坐标轴对象（方法）
// 会将选择集中的元素 <g> 传递给坐标轴对象的方法，作为第一个参数
// 以便将坐标轴在相应容器内部渲染出来
// 具体参考官方文档 https://d3js.org/d3-selection/control-flow#selection_call
// 或这一篇文档 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#其他方法

// 绘制纵坐标轴
svg.append("g")
  // 通过设置 CSS 的 transform 属性将纵向坐标轴容器「移动」到左侧
  .attr("transform", `translate(${marginLeft},0)`)
  // 纵轴是一个刻度值朝左的坐标轴
  // 通过 axis.ticks(count) 设置刻度数量的参考值（避免刻度过多导致刻度值重叠而影响图表的可读性）
  // 而且将坐标轴的刻度 tickSize 长度设置为 0（即取消坐标轴的刻度线）
  // 并将刻度值与轴线的距离 tickPadding 设置为 4px
  .call(d3.axisLeft(y).tickSize(0).tickPadding(4))
  // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
  .call(g => g.select(".domain").remove());

  /**
   *
   * 绘制山脊线图
   *
   */
  // Create the area generator and its top-line generator.
  // 使用 d3.area() 创建一个面积生成器，它适用于生成各个系列的面积图
  // 面积生成器会基于给定的数据生成面积形状
  // 调用面积生成器时返回的结果，会基于生成器是否设置了画布上下文 context 而不同。如果设置了画布上下文 context，则生成一系列在画布上绘制路径的方法，通过调用它们可以将路径绘制到画布上；如果没有设置画布上下文 context，则生成字符串，可以作为 `<path>` 元素的属性 `d` 的值
  // 具体可以参考官方文档 https://d3js.org/d3-shape/area
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#面积生成器-areas
  const area = d3.area()
      // 设置两点之间的曲线插值器，这里使用 D3 所提供的一种内置曲线插值器 d3.curveBasis
      // 该插值效果是在两个数据点之间，生成三次样条曲线 cubic basis spline
      // 具体效果参考 https://d3js.org/d3-shape/curve#curveBasis
      .curve(d3.curveBasis)
      // 💡 调用面积生成器方法 area.defined() 设置数据完整性检验函数
      // 该函数会在调用面积生成器时，为数组中的每一个元素都执行一次，返回布尔值，以判断该元素的数据是否完整
      // 该函数传入三个入参，当前的元素 `d`，该元素在数组中的索引 `i`，整个数组 `data`
      // 当函数返回 true 时，面积生成器就会执行下一步（调用坐标读取函数），最后生成该元素相应的坐标数据
      // 当函数返回 false 时，该元素就会就会跳过，当前面积就会截止，并在下一个有定义的元素再开始绘制，反映在图上就是一个个分离的面积区块
      // 具体可以参考官方文档 https://d3js.org/d3-shape/area#area_defined
      // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#面积生成器-areas
      // 这里通过判断当前所遍历的值是否为 NaN 来判定该数据是否缺失
      .defined(d => !isNaN(d))
      // 设置下边界线横坐标读取函数
      // 该函数会在调用面积生成器时，为数组中的每一个元素都执行一次，以返回该数据所对应的横坐标
      // 这里基于当前所遍历的数据点的索引值，从数组 dates[i] 中读取出所对应的时间，并采用比例尺 x 进行映射，计算出相应的横坐标值
      .x((d, i) => x(dates[i]))
      // 设置下边界线的纵坐标的读取函数
      // 所有系列的面积图的下边界线的初始定位都是 svg 的顶部，所以纵坐标值都是 0
      .y0(0)
      // 设置上边界线的纵坐标的读取函数，基于当前所遍历的数据点（车流量）并采用比例尺  z 进行映射，计算出相应的纵坐标值
      .y1(d => z(d));

  // 为各个面积图绘制上边界线（让重叠在一起的面积图更易于区分开了）
  // 使用方法 area.lineY1() 返回一个线段生成器，用于在绘制面积图的上边界线
  // 它的横坐标读取函数返回的是 x1，纵坐标读取函数返回的是 y1
  const line = area.lineY1();

  // 创建容器
  // 首先建一个整体的容器
  const group = svg.append("g")
    .selectAll("g") // 返回一个选择集，其中虚拟/占位元素是一系列的 <g> 元素，它们分别作为各个系列的面积图的容器
    .data(series) // 绑定数据，每个容器 <g> 元素对应一个系列的数据
    .join("g") // 将这些 <g> 元素绘制到页面上
      // 通过设置 CSS 的 transform 属性将各系列的容器定位不同的位置
      // 基于各系列的名称（地点名）并采用比例尺 y 进行映射 y(d.name) 计算出相应（分隔点）的纵坐标值，然后向下偏移 1px ❓ 可能是要覆盖掉横坐标轴的轴线
      .attr("transform", d => `translate(0,${y(d.name) + 1})`);

  // 将各个系列的面积图绘制到页面上
  group.append("path") // 使用路径 <path> 元素绘制面积形状
      .attr("fill", "#ddd") // 将面积的填充颜色设置为灰色
      // 由于面积生成器并没有调用方法 area.context(parentDOM) 设置画布上下文
      // 所以调用面积生成器 area(aapl) 返回的结果是字符串
      // 该值作为 `<path>` 元素的属性 `d` 的值
      .attr("d", d => area(d.values));

  // 将各个面积图的上边界线绘制到页面上
  group.append("path") // 使用路径 <path> 元素绘制折线
      .attr("fill", "none") // 只需要路径的描边作为折线，不需要填充，所以属性 fill 设置为 none
      .attr("stroke", "black") // 设置描边颜色
      // 由于线段生成器并没有调用方法 line.context(parentDOM) 设置画布上下文
      // 所以调用线段生成器 line(aapl) 返回的结果是字符串
      // 该值作为 `<path>` 元素的属性 `d` 的值
      .attr("d", d => line(d.values));
});
