// 参考自 https://observablehq.com/@d3/u-s-population-by-state-1790-1990

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
const marginTop = 10;
const marginRight = 10;
const marginBottom = 30;
const marginLeft = 40;

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
const regionURL = "https://gist.githubusercontent.com/Benbinbin/ccfcacef61243981f9fdfbb4fbee9831/raw/06812ab2bd5876214ed65814fcfc141ba42815f6/us%2520census%2520bureau%2520regions%2520and%2520divisions.csv";

// 数据来源网页 https://observablehq.com/@d3/u-s-population-by-state-1790-1990 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/c35c3c5451f33b861f519ca521839682/raw/74683c8dd2edc1718fbece733ca4b63e33d84cdc/population.tsv";

(async function () {
  // 从远端获取 csv 文件并进行解析
  // 参考 d3-fetch 模块 https://d3js.org/d3-fetch#csv
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-fetch-and-parse-data
  // 该表格将美国各州对应到 9 个区域
  const regions = await d3.csv(regionURL);

  console.log(regions);

  // 基于数组创建一个 Map 映射，以键值对的方式来表示原始数据，即键名为各州的名称，对应的值是 9 个区域之一
  // 先将原数组 regions 转换为一个嵌套数组（它的每个元素都是一个二元数组），只保留原来的数据点（对象）的属性 d.state（州名称）和属性 d.Division（该州所对应的区域），分别作为二元数组的第一个和第二个元素
  // 然后 new Map() 会将每个二元数组转换为一个映射关系
  const regionByState = new Map(regions.map(d => [d.State, d.Division]));

  console.log(regionByState);

  // 使用 d3.range(start, stop, step) 创建一个等差数列，并用数列的各项构成一个数组
  // 这里要创建一个表示年份的数组，要与数据集的年份一致，由于每 10 年进行一次人口普查，所以步长 step 设置为 10
  const years = d3.range(1790, 2000, 10);

  // 将美国各州划分为 9 个区域（已排序）
  const regionRank = ["New England", "Middle Atlantic", "South Atlantic", "East South Central", "West South Central", "East North Central", "West North Central", "Mountain", "Pacific"];

  // 从远端获取 tsv 文件（它由一些数据值和 `\t` 作为分隔符构成的字符串）并进行解析
  // 参考 d3-fetch 模块 https://d3js.org/d3-fetch#tsv
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-fetch-and-parse-data
  // 使用方法 d3.tsv(url, requestInit, row) 进行解析（具有表头），最后得到一个对象数组（即数组的元素是一个对象，表示一个数据点/一行数据）
  // 第一个参数 url 是需要获取的数据的路径
  // 第二个参数 requestInit 是一个对象，用以设置网络请求的额外配置
  // 第三个参数 row 是一个函数，用于对行数据进行转换或筛选，它返回的是一个对象，表示所遍历行的数据
  // 这里的转换函数是 (d, i) => i === 0 ? null : ({name: d[""], values: years.map(y => +d[y].replace(/,/g, "") || 0)})
  // 由于原数据集的第二行（原始 tsv 表格的第一行是表头，数据从第二行开始，对应的索引值 i 是 0）是美国不同年份人口总和，而不是各州的人口数，并不需要这一行的数据
  // 所以当索引值 i === 0 时返回 null 以忽略该行数据
  // 原始的 tsv 表格的表头第一列是空的，所以 d[""] 获取的是该数据点位于第一列的值，则返回的对象种属性 name 的值表示该行数据属于哪个州
  // 返回的对象还具有属性 values 是一个数组，使用 years.map(y => +d[y].replace(/,/g, "") 进行构建，包含该州各年的人口数据
  // 其中 years 是前面构建包含年份的数组，使用 JS 数组原生方法 years.map() 遍历该数组的各个元素，通过 d[y] 获取该州在相应年份的人口数据（💡 由于原始的人口数据是字符串，并使用逗号 `,` 分隔千位，所以还需要用正则表达式删除掉分隔符），并通过 + 号将字符串转换为数值。有些州在特定的年份的数据是缺失的，则默认将该年份的人口数量设置为 0
  const states = await d3.tsv(dataURL,(d, i) => i === 0 ? null : ({name: d[""], values: years.map(y => +d[y].replace(/,/g, "") || 0)}));
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  console.log(states);

  // 对 states 数据集进行排序
  // 使用 JS 数组的原生方法 states.sort(compareFn) 对数据集进行排序，其中 compareFn 对比函数使用 D3 内置的 comparator 对比器 `d3.ascending()` 或 `d3.descending`
  // d3.ascending(a, b) 对比两个参数 a 和 b 的大小，基于大小关系返回不同的值：
  // * 如果 a 小于 b 则返回 -1
  // * 如果 a 大于 b 则返回 1
  // * 如果 a 等于 b 则返回 0
  // 根据以上规则，最后会将较小值排在前面，较大值排在后面，即升序排列
  // d3.descending(a, b) 规则正好相反
  // 首先将各州按照所属的区域进行排序（区域的先后顺序依据于 regionRank 数组），这可以让同属一个区域的各州可以堆叠在一起，填充同样的颜色；然后对于同属一个区域的各州，按照各年人口的累加值进行降序排列（人口较大的州位于同区域的下方）
  // 这里先根据 regionByState.get(a.name 或 b.name) 获取所需对比的两个州所对应的区域，然后通过 regionRank.indexOf() 查询该区域在数组 regionRank 中的索引值，根据对比器 d3.ascending() 的规则进行升序排列，即如果 a 州所在的区域对应的索引值较低就返回 -1，如果较大就返回 1
  // 如果 a、b 两个州都属于同一个区域就返回 0，则需要继续进行排序，根据对比器 d3.descending() 的规则，按照该州各年人口的累加值进行降序排列
  states.sort((a, b) => d3.ascending(regionRank.indexOf(regionByState.get(a.name)), regionRank.indexOf(regionByState.get(b.name))) || d3.descending(d3.sum(a.values), d3.sum(b.values)));

  // 最后构建一个对象 data 是将数据集 state 进行「转置」（得到一个二维表，每一行是特定年份的各州的人口数据）
  // 使用 JS 数组的原生方法 years.map() 遍历每一个年份，基于每个年份构建出一个对象（包括年份和该年份每一个州的人口数据）
  // 首先构建一个数组，它包含两个元素
  // 第一个元素是 ["date", new Date(Date.UTC(y, 0, 1))] 其中使用 JS 原生方法 Date.UTC() 基于当前所遍历的数值（表示年份）创建一个表示该年 1 月 1 日的 Date 对象
  // 第二个元素是 states.map(s => [s.name, s.values[i]]) 遍历 states 的元素，返回的是一个二元数组 [s.name, s.values[i]] 作为新的元素，其中 s.name 是当前所遍历的州的名称，s.values[i] 是该州在特定年份（索引值 i 在数组 years 中对应的年份）对应的人口数量
  // 使用 JS 数组的原生方法 arr1.concat(arr2) 将两个数组整合起来，得到一个嵌套数组（它的每个元素都是二元数组）
  // 最后使用 JS 对象的静态方法 Object.fromEntries() 将嵌套数组（它的元素是二元数组）转换为对象，以键值对的方式表示原来的数据，即每个二元数组的第一个元素作为属性键名第二个元素作为，第二个元素作为相应的属性值
  // 另外还使用 JS 对象的静态方法 Object.assign() 为以上对象添加额外的属性 columns，它是一个数组，表示「转置」后的二维表的表头（第一个元素是 `"date"` 字符串，后面的元素是各州的名称）
  const data = Object.assign(years.map((y, i) => Object.fromEntries([["date", new Date(Date.UTC(y, 0, 1))]].concat(states.map(s => [s.name, s.values[i]])))), {columns: ["date", ...states.map(s => s.name)]});

  console.log(data);

  /**
   *
   * 对数据进行转换
   *
   */
  // 决定有哪些系列进行堆叠可视化
  // 通过堆叠生成器对数据进行转换，便于后续绘制堆叠图
  // 返回一个数组，每一个元素都是一个系列（整个面积图就是由多个系列堆叠而成的）
  // 而每一个元素（系列）也是一个数组，其中每个元素是属于该系列的一个数据点，例如在本示例中，有 21 个年份的数据，所以每个系列会有 21 个数据点
  // 具体可以参考官方文档 https://d3js.org/d3-shape/stack
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#堆叠生成器-stacks
  series = d3.stack()
    // 设置系列的名称（数组）
    // 基于数据集 data 的属性 columns（它是一个数组，表示二维表的表头），除去第一个元素（它字符串是 "date" 表示时间列，不是州的名称）得到的数组
    // 即有哪几个州
    // D3 为每一个系列都设置了一个属性 key，其值是系列名称（生成面积图时，系列堆叠的顺序就按照系列名称的排序）
    .keys(data.columns.slice(1))
    // 设置堆叠基线函数，这里采用 D3 所提供的一种基线函数 d3.stackOffsetExpand
    // 对数据进行标准化（相当于把各系列的绝对数值转换为所占的百分比），基线是零，上边界线是 1
    // 所以每个横坐标值所对应的总堆叠高度都一致（即纵坐标值为 1）
    // 具体可以参考官方文档 https://d3js.org/d3-shape/stack#stackOffsetExpand
    .offset(d3.stackOffsetExpand)
    // 调用堆叠生成器，传入数据
    (data)


  /**
   *
   * 构建比例尺
   *
   */
  // 设置横坐标轴的比例尺
  // 横坐标轴的数据是年份（时间），使用 d3.scaleUtc 构建一个时间比例尺（连续型比例尺的一种）
  // 该时间比例尺采用协调世界时 UTC，即处于不同时区的用户查看图表时也会显示同样的时间
  // 具体可以参考官方文档 https://d3js.org/d3-scale/time
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#时间比例尺-time-scales
  const x = d3.scaleUtc()
      // 设置定义域范围
      // 从数据集的每个数据点中提取出年份（时间），并用 d3.extent() 计算出它的范围
      .domain(d3.extent(data, d => d.date))
      // 设置值域范围（所映射的可视元素）
      // svg 元素的宽度（减去留白区域）
      .range([marginLeft, width - marginRight]);

  // 设置纵坐标轴的比例尺
  // 纵坐标轴的数据是连续型的数值（百分比），使用 d3.scaleLinear 构建一个线性比例尺
  const y = d3.scaleLinear()
      // 💡 这里省略设置纵坐标轴比例尺的定义域范围
      // 因为标准化后，堆叠面积图的纵轴定义域范围就是 [0, 1] 与线性比例尺的默认定义域相同
      // 设置值域范围（所映射的可视元素）
      // svg 元素的宽度（减去留白区域）
      .range([height - marginBottom, marginTop]);

  // 设置颜色比例尺
  // 为不同系列设置不同的配色
  // 使用 d3.scaleOrdinal() 排序比例尺 Ordinal Scales 将离散型的定义域映射到离散型值域
  // 具体参考官方文档 https://d3js.org/d3-scale/ordinal
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#排序比例尺-ordinal-scales
  const color = d3.scaleOrdinal()
  // 设置定义域范围
  // 各区域的名称（即各州所对应的 9 个区域）
  .domain(regionRank)
  // 设置值域范围
  // 使用 D3 内置的一种配色方案 d3.schemeCategory10
  // 它是一个数组，包含一些预设的颜色（共 10 种）
  // 具体可参考官方文档 https://d3js.org/d3-scale-chromatic/categorical#schemeCategory10
  // 这里区域数量是 9 种，依次对应 d3.schemeTableau10 配色方案前 9 种颜色
  .range(d3.schemeCategory10)
  // 设置默认颜色
  // 当使用颜色比例尺时 color(value) 传入的参数不在定义域范围中，默认返回的颜色值
  .unknown("gray");


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
      // 通过 axis.ticks(count) 设置刻度数量的参考值（避免刻度过多导致刻度值重叠而影响图表的可读性）
      // 将坐标轴的外侧刻度 tickSizeOuter 长度设置为 0（即取消坐标轴首尾两端的刻度）
      .call(d3.axisBottom(x).ticks(width / 80).tickSizeOuter(0));

  // 绘制纵坐标轴
  svg.append("g")
      // 通过设置 CSS 的 transform 属性将纵向坐标轴容器「移动」到左侧
      .attr("transform", `translate(${marginLeft},0)`)
      // 纵轴是一个刻度值朝左的坐标轴
      // 并使用坐标轴对象的方法 axis.ticks() 设置坐标轴的刻度数量和刻度值格式
      // 其中第一个参数用于设置刻度数量（这里设置的是预期值，并不是最终值，D3 会基于出入的数量进行调整，以便刻度更可视）
      // 而第二个参数用于设置刻度值格式，这里设置为 "%" 表示数值采用百分比表示
      .call(d3.axisLeft(y).ticks(10, "%"))
      // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
      .call(g => g.select(".domain").remove());

  /**
   *
   * 绘制面积图内的面积形状
   *
   */
  // 使用 d3.area() 创建一个面积生成器
  // 面积生成器会基于给定的数据生成面积形状
  // 调用面积生成器时返回的结果，会基于生成器是否设置了画布上下文 context 而不同。如果设置了画布上下文 context，则生成一系列在画布上绘制路径的方法，通过调用它们可以将路径绘制到画布上；如果没有设置画布上下文 context，则生成字符串，可以作为 `<path>` 元素的属性 `d` 的值
  // 具体可以参考官方文档 https://d3js.org/d3-shape/area
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#面积生成器-areas
  const area = d3.area()
  // 设置下边界线横坐标读取函数
  // 💡 不需要再设置上边界线横坐标读取函数，因为默认会复用相应的下边界线横坐标值，这符合横向延伸的面积图
  // 该函数会在调用面积生成器时，为数组中的每一个元素都执行一次，以返回该数据所对应的横坐标
  // 这里基于每个数据点的年份（时间）d.data.date（这里的 d.data 是该数据点 d 转换前/原始的数据结构，它的属性 date 就是该数据点对应的年份）并采用比例尺 x 进行映射，计算出相应的横坐标
  .x(d => x(d.data.date))
  // 设置下边界线的纵坐标的读取函数
  // 这里基于每个数据点（二元数组）的第一个元素 d[0] 并采用比例尺 y 进行映射，计算出相应的纵坐标
  .y0(d => y(d[0]))
  // 设置上边界线的纵坐标的读取函数
  // 这里基于每个数据点（二元数组）的第二个元素 d[1] 并采用比例尺 y 进行映射，计算出相应的纵坐标
  .y1(d => y(d[1]));

  // 将每个系列的面积形状绘制到页面上
  // 创建一个元素 <g> 作为容器
  svg.append("g")
    .attr("fill-opacity", 0.8)  // 设置填充的透明度
  .selectAll("path") // 返回一个选择集，其中虚拟/占位元素是一系列的 <path> 路径元素，用于绘制各系列的形状
  .data(series) // 绑定数据，每个路径元素 <path> 对应一个系列数据
  .join("path") // 将元素绘制到页面上
    // 设置颜色，不同系列/堆叠层对应不同的颜色
    // 其中所绑定数据是一个数组，但具有属性 key 表示该系列对应的州的名称，填充色是由该州所属的区域所决定的
    // 首先通过映射 regionByState.get(key) 获取该州所对应的区域，然后使用颜色比例尺 color() 获取相应的颜色
    .attr("fill", ({key}) => color(regionByState.get(key)))
    // 由于面积生成器并没有调用方法 area.context(canvasContext) 设置画布上下文
    // 所以调用面积生成器 area 返回的结果是字符串
    // 该值作为 `<path>` 元素的属性 `d` 的值
    .attr("d", area)
  // 最后在每个路径元素 <path> 里添加一个 <title> 元素
  // 以便鼠标 hover 在相应的各系列的面积之上时，可以显示 tooltip 提示信息
  .append("title")
    // 设置 tooltip 的文本内容，采用所绑定数据的属性 key，表示当前所遍历的系列名称
    .text(({key}) => key);

  /**
   *
   * 绘制面积图内的各系列（堆叠形状）之间的分隔线（上边界线）
   *
   */
  // 创建一个容器
  svg.append("g")
      // 只需要路径的描边作为折线，不需要填充，所以属性 fill 设置为 none
      .attr("fill", "none")
      .attr("stroke-width", 0.75) // 描边的宽度
    // 使用路径 <path> 元素绘制折线
    .selectAll("path") // 返回一个选择集，其中虚拟/占位元素是一系列的 <path> 路径元素，用于绘制各系列的边界线
    .data(series) // 绑定数据，每个路径元素 <path> 对应一个系列数据
    .join("path") // 将元素绘制到页面上
      // 设置描边颜色
      // 基于原来系列的填充色，采用一个更深的颜色
      // 首先通过映射 regionByState.get(key) 获取当前系列表示的州所对应的区域，然后使用颜色比例尺 color() 获取相应的颜色
      // 然后使用 d3.lab(color) 创建一个符合 CIELAB 色彩空间的颜色对象，具体参考官方文档 https://d3js.org/d3-color#lab
      // 💡 该色彩空间旨在作为一个感知上统一的空间，更多介绍可以参考 https://en.wikipedia.org/wiki/CIELAB_color_space
      // 最后使用 colorObj.darker() 基于原来的颜色得到一个更深的颜色
      .attr("stroke", ({key}) => d3.lab(color(regionByState.get(key))).darker())
      // 方法 area.lineY1() 返回一个线段生成器，用于在绘制面积图的上边界线
      // 调用该线段生成器，返回的结果是字符串，该值作为 `<path>` 元素的属性 `d` 的值
      .attr("d", area.lineY1());

  /**
   *
   * 为每个系列添加标注信息
   *
   */
  // 为每个系列的面积创建一个中线，其路径作为标注信息（文本）的延伸方向
  // 使用方法 d3.line() 创建一个线段生成器
  // 线段生成器会基于给定的坐标点生成线段（或曲线）
  // 调用线段生成器时返回的结果，会基于生成器是否设置了画布上下文 context 而不同。如果设置了画布上下文 context，则生成一系列在画布上绘制路径的方法，通过调用它们可以将路径绘制到画布上；如果没有设置画布上下文 context，则生成字符串，可以作为 `<path>` 元素的属性 `d` 的值
  // 具体可以参考官方文档 https://d3js.org/d3-shape/line
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#线段生成器-lines
  const midline = d3.line()
  // 设置两点之间的曲线插值器，这里使用 D3 所提供的一种内置曲线插值器 d3.curveBasis
  // 该插值效果是在两个数据点之间，生成三次样条曲线 cubic basis spline
  // 具体效果参考 https://d3js.org/d3-shape/curve#curveBasis
  .curve(d3.curveBasis)
  // 设置横坐标读取函数
  // 该函数会在调用线段生成器时，为数组中的每一个元素都执行一次，以返回该数据所对应的横坐标
  // 这里基于每个数据点的年份（时间）d.data.date 并采用比例尺 x 进行映射，计算出相应的横坐标
  .x(d => x(d.data.date))
  // 设置纵坐标读取函数
  // 这里采用每个数据在该系列的上下界的纵坐标的和的一半（中点）
  .y(d => y((d[0] + d[1]) / 2));

  // 💡 创建一个 <defs> 元素，在其中定义一些图形元素（一般具有属性 id 以便被其他元素引用），以便之后使用（而不在当前渲染出来）
  // 在其中添加一系列 <path> 元素，作为各系列的标注信息（文本）的路径
  const defs = svg.append("defs")
    // 返回一个选择集，其中虚拟/占位元素是一系列的 <path> 路径元素
    .selectAll("path")
    .data(series) // 绑定数据，每个路径元素 <path> 对应一个系列数据
    .join("path") // 将元素绘制到页面上
      // 为 <path> 设置属性 id（方便其他元素基于 id 来引用），以避免与其他元素发生冲突
      // 💡 在参考的 Observable Notebook 使用了平台的标准库所提供的方法 DOM.uid(namespace) 创建一个唯一 ID 号
      // 💡 具体参考官方文档 https://observablehq.com/documentation/misc/standard-library#dom-uid-name
      // 💡 方法 DOM.uid() 的具体实现可参考源码 https://github.com/observablehq/stdlib/blob/main/src/dom/uid.js
      // 这里直接使用当前所遍历的数据的索引值 i 作为 id 值
      // 并将该属性值添加到所绑定的数据（对象）的属性 id 中（以便后面绑定同样的 series 数据集时，可以通过 id 引用相应的路径元素）
      .attr("id", (d, index) => (d.id = index))
      // 调用线段生成器 midline 生成各堆叠面积形状的中线
      // 返回的结果是字符串，该值作为 `<path>` 元素的属性 `d` 的值
      .attr("d", midline);

  // console.log(defs)

  // 为每个系列添加文本标注
  svg.append("g")
      .style("font", "10px sans-serif") // 设置字体
      .attr("text-anchor", "middle") // 设置文本对齐方式
    // 使用 <text> 元素添加添加标注信息
    .selectAll("text") // 返回一个选择集，其中虚拟/占位元素是一系列的 <text> 路径元素
    .data(series)  // 绑定数据，每个文本元素 <text> 对应一个系列数据
    .join("text") // 将元素绘制到页面上
      .attr("dy", "0.35em") // 设置文本在垂直方向上的偏移（让文本居中对齐）
    // 在每个 <text> 元素里添加 <textPath> 元素（使用该元素包裹具体的文本内容），让文本沿着指定的路径放置
    .append("textPath")
      // 设置属性 href，采用所绑定数据的属性 d.id.href，指向前面在元素 <defs> 所创建的相应路径元素 <path>
      // 所以每个系列的标注文本会沿着所在系列的中线延伸
      .attr("href", d => `#${d.id}`)
      // 设置文字距离路径开头多远（采用百分比）开始排布，让文本定位到（所在系列面积形状中）纵向空间较大的位置（如果在狭窄的位置放置文字，可能会与系列分界线重叠而影响可读性，文字还可能叠到在其他系列的面积上）
      // 首先Math.max(0.05, Math.min(0.95, ...) 表示文字排布约束在距离路径的开头 5% 和 95% 区间中
      // 其中最佳的放置点是在该系列上下界（同一个横坐标点）差距最大的地方，即 d3.maxIndex(d, d => d[1] - d[0]) 返回的索引值所对应的数据点，然后通过 d3.maxIndex(d, d => d[1] - d[0]) / (d.length - 1))) * 100}% 得到该数据点到路径的开头的距离占总路径的比例
      .attr("startOffset", d => `${Math.max(0.05, Math.min(0.95, d.offset = d3.maxIndex(d, d => d[1] - d[0]) / (d.length - 1))) * 100}%`)
      .text(d => d.key); // 设置文本内容
})()

